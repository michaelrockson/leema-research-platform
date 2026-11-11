import re

from fastapi import APIRouter, HTTPException

from database import get_session
from pipelines.core_pipeline import CorePipeline
from pipelines.sentiment_pipeline import SentimentPipeline
from repositories.brief_repository import BriefRepository
from utils.helpers import run_pipeline
from utils.logger import logger

router = APIRouter(tags = ["Analysis"])

MAX_TITLE_WORDS = 12
SECTION_SEPARATOR = "\n\n"


def _title_from_problem_statement(problem_statement: str) -> str:
    """
    Build a problem-specific title for briefs that have no HEADLINE.
    Problem statements follow "X users struggle with Y, creating opportunity
    for Z...", so the title keeps the "who + problem" part before the
    opportunity clause, capped at MAX_TITLE_WORDS words.
    """
    problem_part = re.split(
        r",?\s*(?:creating|which creates|presenting|offering|leading to)"
        r"\s+(?:an?\s+)?(?:\w+\s+)?opportunit",
        problem_statement,
        maxsplit = 1,
        flags = re.IGNORECASE,
    )[0]
    problem_part = re.split(r"(?<=[.!?])\s", problem_part, maxsplit = 1)[0]
    problem_part = problem_part.strip().rstrip(".,;:")

    words = problem_part.split()
    if not words:
        return "Customer problem"
    title = " ".join(words[:MAX_TITLE_WORDS])
    if len(words) > MAX_TITLE_WORDS:
        title += "…"
    return title[0].upper() + title[1:]


def split_brief_sections(content: str) -> list[str]:
    """
    Split a curator brief into one text section per opportunity. Newer briefs
    open each opportunity with HEADLINE, older ones with PROBLEM STATEMENT.
    """
    if re.search(r"HEADLINE:", content, flags = re.IGNORECASE):
        section_marker = r"(?=HEADLINE:)"
    else:
        section_marker = r"(?=PROBLEM STATEMENT:)"
    sections = re.split(section_marker, content, flags = re.IGNORECASE)
    sections = [section.strip() for section in sections if section.strip()]
    return sections or [content]


def build_finding_id(brief_id: int, section_index: int) -> str:
    return f"{brief_id}-{section_index}"


def parse_finding_id(finding_id: str) -> tuple[int, int] | None:
    match = re.fullmatch(r"(\d+)-(\d+)", finding_id)
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def _parse_brief_to_findings(briefs):
    """
    Parses raw curator brief text into the frontend FindingDataProps structure:
    {
        "id": str,
        "title": str,
        "feasibility": str,
        "description": str,
        "sentiment": str,
        "source_url": str | None,
        "source_upvotes": int | None,
        "source_comments": int | None,
    }
    """
    findings = []

    for brief in briefs:
        sections = split_brief_sections(brief.curated_content or "")

        for section_index, section in enumerate(sections):
            headline_match = re.search(
                r"HEADLINE:\s*\"?([^\n\"]+)\"?", section,
                flags = re.IGNORECASE
            )
            source_match = re.search(
                r"SOURCE URL:\s*(https?://\S+)", section,
                flags = re.IGNORECASE
            )
            upvotes_match = re.search(
                r"SOURCE UPVOTES:\s*(-?\d+)", section, flags = re.IGNORECASE
            )
            comments_match = re.search(
                r"SOURCE COMMENTS:\s*(\d+)", section, flags = re.IGNORECASE
            )
            problem_match = re.search(
                r"PROBLEM STATEMENT:\s*\"?([^\n\"]+)\"?", section,
                flags = re.IGNORECASE
            )
            sentiment_match = re.search(
                r"SENTIMENT INSIGHT:\s*\"?([^\n\"]+)\"?", section,
                flags = re.IGNORECASE
            )
            strength_match = re.search(
                r"(?:Opportunity Strength|feasibility):\s*\"?([^\n\"]+)\"?",
                section,
                flags = re.IGNORECASE,
            )

            if problem_match:
                description = problem_match.group(1).strip()
            else:
                description = section.strip()

            if sentiment_match:
                sentiment = sentiment_match.group(1).strip()
            else:
                sentiment = (
                    "Sentiment insight captured from customer community discussions."
                )

            feasibility = "High"
            if strength_match:
                feasibility = strength_match.group(1).strip().capitalize()
            elif "low" in section.lower():
                feasibility = "Low"
            elif "medium" in section.lower():
                feasibility = "Medium"

            if headline_match:
                title = headline_match.group(1).strip()
            else:
                title = _title_from_problem_statement(description)

            findings.append({
                "id": build_finding_id(brief.id, section_index),
                "title": title,
                "feasibility": feasibility,
                "description": description,
                "sentiment": sentiment,
                "source_url": source_match.group(1) if source_match else None,
                "source_upvotes":
                    int(upvotes_match.group(1)) if upvotes_match else None,
                "source_comments":
                    int(comments_match.group(1)) if comments_match else None,
            })

    return findings


@router.get("/processdata")
def run_data_analysis():
    """
    Phase 2: Run Sentiment Analysis Pipeline and Core Curator Agent Pipeline.
    Synthesizes customer pain points and returns structured findings for the frontend.
    """
    try:
        logger.info(
            "Phase 2: Starting Sentiment and Core curation pipelines...")
        final_result = run_pipeline(SentimentPipeline())

        # Only ask the curator for a new brief when there is something to curate.
        if final_result.succeeded:
            final_result = run_pipeline(CorePipeline())

        if final_result.has_failed:
            raise HTTPException(status_code = 500,
                                detail = final_result.message)

        session = get_session()
        try:
            brief_repo = BriefRepository(session)
            briefs = brief_repo.get_latest_brief()
            findings = _parse_brief_to_findings(briefs)
        finally:
            session.close()

        logger.info(
            f"Phase 2: Data analysis finished ({final_result.status.value}).")
        return {
            "phase": "analysis",
            "success": True,
            "status": final_result.status.value,
            "message": final_result.message,
            "data": {
                "findings_count": len(findings),
                "findings": findings,
            },
        }
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Failed to run processing layer: {error}",
                     exc_info = True)
        raise HTTPException(
            status_code = 500,
            detail = "Something went wrong while identifying problems. "
                     "Please try again in a few minutes.",
        )


@router.get("/findings")
def get_findings_data():
    """
    Query existing processed opportunity briefs from Phase 2 without re-running the curator agent.
    """
    session = get_session()
    try:
        brief_repo = BriefRepository(session)
        briefs = brief_repo.get_latest_brief()
        findings = _parse_brief_to_findings(briefs)
        return {
            "phase": "analysis",
            "success": True,
            "data": {
                "findings_count": len(findings),
                "findings": findings,
            },
        }
    finally:
        session.close()


@router.delete("/findings/{finding_id}")
def delete_finding(finding_id: str):
    """
    Permanently remove one problem from its stored brief, so it no longer
    appears in findings or in future Notion and email reports.
    Returns the remaining findings.
    """
    parsed_id = parse_finding_id(finding_id)
    if parsed_id is None:
        raise HTTPException(status_code = 400,
                            detail = f"'{finding_id}' is not a valid finding ID.")
    brief_id, section_index = parsed_id

    session = get_session()
    try:
        brief_repo = BriefRepository(session)
        brief = brief_repo.get_brief_by_id(brief_id)
        sections = (
            split_brief_sections(brief.curated_content or "") if brief else []
        )
        if section_index >= len(sections):
            raise HTTPException(
                status_code = 404,
                detail = "That problem no longer exists. Refresh to see the latest findings.",
            )

        remaining_sections = [
            section for index, section in enumerate(sections)
            if index != section_index
        ]
        if remaining_sections:
            brief_repo.update_brief_content(
                brief, SECTION_SEPARATOR.join(remaining_sections))
        else:
            brief_repo.delete_brief(brief)
        session.commit()
        logger.info(f"Deleted finding {finding_id}.")

        findings = _parse_brief_to_findings(brief_repo.get_latest_brief())
        return {
            "phase": "analysis",
            "success": True,
            "message": "Problem deleted.",
            "data": {
                "findings_count": len(findings),
                "findings": findings,
            },
        }
    except HTTPException:
        raise
    except Exception as error:
        session.rollback()
        logger.error(f"Failed to delete finding {finding_id}: {error}",
                     exc_info = True)
        raise HTTPException(
            status_code = 500,
            detail = "Something went wrong while deleting that problem. "
                     "Please try again.",
        )
    finally:
        session.close()
