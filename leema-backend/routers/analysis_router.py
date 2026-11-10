import re
from fastapi import APIRouter, HTTPException

from database import get_session
from pipelines.core_pipeline import CorePipeline
from pipelines.sentiment_pipeline import SentimentPipeline
from repositories.brief_repository import BriefRepository
from utils.helpers import run_pipeline
from utils.logger import logger

router = APIRouter(tags = ["Analysis"])


def _parse_brief_to_findings(briefs):
    """
    Parses raw curator brief text into the frontend FindingDataProps structure:
    {
        "id": int,
        "title": str,
        "feasibility": str,
        "description": str,
        "sentiment": str,
    }
    """
    findings = []
    finding_id = 1

    for brief in briefs:
        content = brief.curated_content or ""
        sections = re.split(r"(?=PROBLEM STATEMENT:)", content,
                            flags = re.IGNORECASE)
        sections = [s.strip() for s in sections if s.strip()]

        if not sections:
            sections = [content]

        for sec in sections:
            problem_match = re.search(
                r"PROBLEM STATEMENT:\s*\"?([^\n\"]+)\"?", sec,
                flags = re.IGNORECASE
            )
            sentiment_match = re.search(
                r"SENTIMENT INSIGHT:\s*\"?([^\n\"]+)\"?", sec,
                flags = re.IGNORECASE
            )
            strength_match = re.search(
                r"(?:Opportunity Strength|feasibility):\s*\"?([^\n\"]+)\"?",
                sec,
                flags = re.IGNORECASE,
            )

            if problem_match:
                description = problem_match.group(1).strip()
            else:
                description = sec.strip()

            if sentiment_match:
                sentiment = sentiment_match.group(1).strip()
            else:
                sentiment = (
                    "Sentiment insight captured from customer community discussions."
                )

            feasibility = "High"
            if strength_match:
                feasibility = strength_match.group(1).strip().capitalize()
            elif "low" in sec.lower():
                feasibility = "Low"
            elif "medium" in sec.lower():
                feasibility = "Medium"

            findings.append({
                "id": finding_id,
                "title": "PROBLEM STATEMENT",
                "feasibility": feasibility,
                "description": description,
                "sentiment": sentiment,
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
    except Exception as err:
        logger.error(f"Failed to run processing layer: {err}")
        raise HTTPException(
            status_code = 500, detail = f"Data analysis phase failed: {err}"
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
