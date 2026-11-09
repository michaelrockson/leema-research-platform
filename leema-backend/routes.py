import asyncio
import json
import re
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database import get_session
from database.init_db import init_db
from pipelines.core_pipeline import CorePipeline
from pipelines.egress_pipeline import EgressPipeline
from pipelines.ingress_pipeline import IngressPipeline
from pipelines.scout_pipeline import ScoutBotPipeline
from pipelines.sentiment_pipeline import SentimentPipeline
from repositories.brief_repository import BriefRepository
from repositories.post_repository import PostRepository
from settings import settings
from utils.helpers import run_pipeline
from utils.logger import logger

app = FastAPI(
    title = "Leema AI Agent Backend",
    description = "Three-Phase API powering customer problem discovery, sentiment analysis, and egress reporting.",
    version = "1.0.0",
)

# Maintain backwards compatibility if referenced as 'server'
server = app

# Enable CORS for local frontend clients (Vite / React default ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)


class ExtractionRequest(BaseModel):
    subreddits: Optional[List[str]] = None
    queries: Optional[List[str]] = None


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


@app.get("/RunExtraction")
def run_extraction(subreddits: Optional[str] = None):
    """
    Phase 1: Run Scout Bot (with boolean OR combined queries) and Ingress Pipeline.
    Pass optional ?subreddits=accounting,bookkeeping to target specific communities.
    """
    try:
        logger.info(
            "Phase 1: Initializing database and starting extraction...")
        init_db()

        subreddit_list = (
            [s.strip().replace("r/", "") for s in subreddits.split(",") if
             s.strip()]
            if subreddits
            else None
        )

        scout = ScoutBotPipeline(subreddits = subreddit_list)
        ingress = IngressPipeline()

        pipelines = [scout, ingress]
        for pipeline in pipelines:
            status = run_pipeline(pipeline)
            if not status:
                raise RuntimeError(
                    f"Pipeline stage {pipeline.__class__.__name__} failed or found no qualifying data."
                )

        session = get_session()
        try:
            repo = PostRepository(session)
            posts = repo.get_all_posts()
            extracted_items = [
                {
                    "id": p.id,
                    "submission_id": p.submission_id,
                    "subreddit": p.subreddit,
                    "title": p.title,
                    "score": p.score,
                    "number_of_comments": p.number_of_comments,
                    "post_url": p.post_url,
                }
                for p in posts[-20:]
            ]
            total_count = len(posts)
        finally:
            session.close()

        logger.info("Phase 1: Full extraction execution successful.")
        return {
            "phase": "extraction",
            "success": True,
            "message": "Extraction Process Completed Successfully",
            "data": {
                "total_posts_extracted": total_count,
                "recent_posts": extracted_items,
            },
        }
    except Exception as err:
        logger.error(f"Failed to run extraction process: {err}")
        raise HTTPException(
            status_code = 500, detail = f"Extraction phase failed: {err}"
        )


@app.post("/RunExtraction")
def run_extraction_with_body(payload: ExtractionRequest):
    """
    Phase 1 POST endpoint: Accepts JSON payload with specific subreddits or queries.
    """
    subreddits_str = ",".join(
        payload.subreddits) if payload.subreddits else None
    return run_extraction(subreddits = subreddits_str)


@app.get("/RunExtraction/stream")
async def run_extraction_stream(subreddits: Optional[str] = None):
    """
    Phase 1 (Server-Sent Events / Streaming):
    Streams live progress events and extracted post chunks to the client.
    Frontend can subscribe with:
      const es = new EventSource('http://127.0.0.1:8000/RunExtraction/stream');
      es.onmessage = (e) => { const event = JSON.parse(e.data); ... };
    """
    subreddit_list = (
        [s.strip().replace("r/", "") for s in subreddits.split(",") if
         s.strip()]
        if subreddits
        else None
    )


    async def event_generator():
        try:
            yield f"data: {json.dumps({'type': 'status', 'stage': 'init', 'message': 'Initializing database...'})}\n\n"
            await asyncio.sleep(0.05)
            init_db()

            target_subs = subreddit_list or settings.DEFAULT_SUBREDDITS
            yield f"data: {json.dumps({'type': 'status', 'stage': 'scout', 'message': f'Scouting {len(target_subs)} community(ies) with optimized boolean queries...', 'subreddits': target_subs})}\n\n"
            await asyncio.sleep(0.05)

            scout = ScoutBotPipeline(subreddits = subreddit_list)
            scout_ok = await asyncio.to_thread(scout.run)
            if not scout_ok:
                yield f"data: {json.dumps({'type': 'warning', 'stage': 'scout', 'message': 'No software-solvable opportunities found in scout phase.'})}\n\n"

            yield f"data: {json.dumps({'type': 'status', 'stage': 'ingress', 'message': 'Fetching full discussions and comments...'})}\n\n"
            await asyncio.sleep(0.05)

            ingress = IngressPipeline()
            await asyncio.to_thread(ingress.run)

            session = get_session()
            try:
                repo = PostRepository(session)
                posts = repo.get_all_posts()
                recent_posts = [
                    {
                        "id": p.id,
                        "submission_id": p.submission_id,
                        "subreddit": p.subreddit,
                        "title": p.title,
                        "score": p.score,
                        "number_of_comments": p.number_of_comments,
                        "post_url": p.post_url,
                    }
                    for p in posts[-20:]
                ]
            finally:
                session.close()

            # Stream each discovered post as an individual chunk
            for post in recent_posts:
                yield f"data: {json.dumps({'type': 'post_chunk', 'data': post})}\n\n"
                await asyncio.sleep(0.02)

            yield f"data: {json.dumps({'type': 'complete', 'success': True, 'message': 'Extraction completed successfully.', 'total': len(recent_posts)})}\n\n"

        except Exception as e:
            logger.error(f"Error in extraction stream: {e}", exc_info = True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"


    return StreamingResponse(
        event_generator(),
        media_type = "text/event-stream",
        headers = {
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/Extractions")
def get_extracted_data():
    """
    Query existing extracted posts from Phase 1 without re-running the extraction pipeline.
    """
    session = get_session()
    try:
        repo = PostRepository(session)
        posts = repo.get_all_posts()
        return {
            "phase": "extraction",
            "success": True,
            "data": {
                "total_posts_extracted": len(posts),
                "posts": [
                    {
                        "id": p.id,
                        "submission_id": p.submission_id,
                        "subreddit": p.subreddit,
                        "title": p.title,
                        "score": p.score,
                        "number_of_comments": p.number_of_comments,
                        "post_url": p.post_url,
                    }
                    for p in posts
                ],
            },
        }
    finally:
        session.close()


@app.get("/ProcessData")
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


@app.get("/Findings")
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


def _execute_egress(choice: str, channel_name: str):
    try:
        logger.info(
            f"Phase 3: Starting Egress pipeline for channel: {channel_name}..."
        )
        egress = EgressPipeline()
        status = run_pipeline(egress, choice)
        if not status:
            raise RuntimeError(
                f"Egress delivery failed for channel '{channel_name}'. Ensure processed briefs exist in database."
            )

        logger.info(f"Phase 3: Sent report via {channel_name}.")
        return {
            "phase": "egress",
            "success": True,
            "message": f"Reports Sent Via {channel_name}.",
            "data": {
                "channel": channel_name,
                "status": "DELIVERED",
            },
        }
    except Exception as err:
        logger.error(f"Failed to send reports by {channel_name}: {err}")
        raise HTTPException(
            status_code = 500,
            detail = f"Egress phase failed for {channel_name}: {err}",
        )


@app.get("/SendAllChannels")
def send_report_by_all_channels():
    """Phase 3: Deliver reports via Notion and Email."""
    return _execute_egress(settings.CHOICE_THREE, "All Channels")


@app.get("/SendByEmail")
def send_report_by_email():
    """Phase 3: Deliver reports via Email only."""
    return _execute_egress(settings.CHOICE_TWO, "Email")


@app.get("/SendByNotion")
def send_report_by_notion():
    """Phase 3: Deliver reports via Notion only."""
    return _execute_egress(settings.CHOICE_ONE, "Notion")


@app.get("/RunAllProcesses")
def run_all_pipelines():
    """
    Executes all three phases in sequence:
      1. Extraction (Scout & Ingress)
      2. Analysis (Sentiment & Core Curation)
      3. Egress (Export via All Channels)
    Returns aggregated JSON data from all three phases.
    """
    try:
        logger.info(
            "Initializing and executing all three phases sequentially...")
        extraction_result = run_extraction()
        analysis_result = run_data_analysis()
        egress_result = send_report_by_all_channels()

        logger.info("Full 3-phase execution completed successfully.")
        return {
            "phase": "all",
            "success": True,
            "message": "Pipeline execution completed successfully across all 3 phases.",
            "data": {
                "extraction": extraction_result.get("data", {}),
                "analysis": analysis_result.get("data", {}),
                "egress": egress_result.get("data", {}),
            },
        }
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Failed to run Leema Agent: {err}")
        raise HTTPException(
            status_code = 500,
            detail = f"Full pipeline execution failed: {err}"
        )


if __name__ == "__main__":
    uvicorn.run("routes:app", host = "127.0.0.1", port = 8000, reload = True)
