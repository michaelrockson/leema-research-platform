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


def _parse_brief_to_findings(briefs):
    """
    Parses raw curator brief text into the frontend FindingDataProps structure:
    {
        "id": int,
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
    finding_id = 1

    for brief in briefs:
        content = brief.curated_content or ""
        # Newer briefs open each opportunity with HEADLINE; older ones with
        # PROBLEM STATEMENT.
        if re.search(r"HEADLINE:", content, flags = re.IGNORECASE):
            section_marker = r"(?=HEADLINE:)"
        else:
            section_marker = r"(?=PROBLEM STATEMENT:)"
        sections = re.split(section_marker, content, flags = re.IGNORECASE)
        sections = [section.strip() for section in sections if section.strip()]

        if not sections:
            sections = [content]

        for section in sections:
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
                "id": finding_id,
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
            finding_id += 1

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
        sentiment = SentimentPipeline()
        core = CorePipeline()

        pipelines = [sentiment, core]
        for pipeline in pipelines:
            status = run_pipeline(pipeline)
            if not status:
                raise RuntimeError(
                    f"Pipeline stage {pipeline.__class__.__name__} failed."
                )

        session = get_session()
        try:
            brief_repo = BriefRepository(session)
            briefs = brief_repo.get_latest_brief()
            findings = _parse_brief_to_findings(briefs)
        finally:
            session.close()

        logger.info("Phase 2: Full data analysis execution successful.")
        return {
            "phase": "analysis",
            "success": True,
            "message": "The Data Analysis Process Completed Successfully!",
            "data": {
                "findings_count": len(findings),
                "findings": findings,
            },
        }
    except Exception as error:
        logger.error(f"Failed to run processing layer: {error}")
        raise HTTPException(
            status_code = 500, detail = f"Data analysis phase failed: {error}"
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
