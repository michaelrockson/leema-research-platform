import asyncio
import json
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database import get_session
from database.init_db import init_db
from pipelines.ingress_pipeline import IngressPipeline
from pipelines.scout_pipeline import ScoutBotPipeline
from repositories.post_repository import PostRepository
from repositories.settings_repository import SettingsRepository
from settings import settings
from utils.helpers import run_pipeline
from utils.logger import logger

router = APIRouter(tags = ["Extraction"])


class ExtractionRequest(BaseModel):
    subreddits: Optional[List[str]] = None
    queries: Optional[List[str]] = None


@router.get("/runextraction")
def run_extraction(
    subreddits: Optional[str] = None, queries: Optional[str] = None
):
    """
    Phase 1: Run Scout Bot (with boolean OR combined queries) and Ingress Pipeline.
    Pass optional ?subreddits=accounting,bookkeeping to target specific communities.
    Falls back to settings stored in the database if query params are omitted.
    """
    try:
        logger.info(
            "Phase 1: Initializing database and starting extraction...")
        init_db()

        session = get_session()
        try:
            settings_repo = SettingsRepository(session)
            active_settings = settings_repo.get_settings()
        finally:
            session.close()

        if subreddits:
            subreddit_list = [
                s.strip().replace("r/", "")
                for s in subreddits.split(",")
                if s.strip()
            ]
        elif active_settings and active_settings.communities:
            subreddit_list = active_settings.communities
        else:
            subreddit_list = settings.DEFAULT_SUBREDDITS

        if queries:
            search_query_list = [
                q.strip() for q in queries.split(",") if q.strip()
            ]
        elif active_settings and active_settings.signals:
            search_query_list = active_settings.signals
        else:
            search_query_list = settings.SEARCH_QUERIES

        scout = ScoutBotPipeline(
            subreddits = subreddit_list,
            search_queries = search_query_list,
        )
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


@router.post("/runextraction")
def run_extraction_with_body(payload: ExtractionRequest):
    """
    Phase 1 POST endpoint: Accepts JSON payload with specific subreddits or queries.
    """
    subreddits_str = (
        ",".join(payload.subreddits) if payload.subreddits else None
    )
    queries_str = (
        ",".join(payload.queries) if payload.queries else None
    )
    return run_extraction(subreddits = subreddits_str, queries = queries_str)


@router.get("/runextraction/stream")
async def run_extraction_stream(subreddits: Optional[str] = None):
    """
    Phase 1 (Server-Sent Events / Streaming):
    Streams live progress events and extracted post chunks to the client.
    """
    session = get_session()
    try:
        settings_repo = SettingsRepository(session)
        active_settings = settings_repo.get_settings()
    finally:
        session.close()

    if subreddits:
        subreddit_list = [
            s.strip().replace("r/", "")
            for s in subreddits.split(",")
            if s.strip()
        ]
    elif active_settings and active_settings.communities:
        subreddit_list = active_settings.communities
    else:
        subreddit_list = settings.DEFAULT_SUBREDDITS

    search_query_list = (
        active_settings.signals
        if active_settings and active_settings.signals
        else settings.SEARCH_QUERIES
    )

    async def event_generator():
        try:
            yield f"data: {json.dumps({'type': 'status', 'stage': 'init', 'message': 'Initializing database...'})}\n\n"
            await asyncio.sleep(0.05)
            init_db()

            target_subs = subreddit_list
            yield f"data: {json.dumps({'type': 'status', 'stage': 'scout', 'message': f'Scouting {len(target_subs)} community(ies) with optimized boolean queries...', 'subreddits': target_subs})}\n\n"
            await asyncio.sleep(0.05)

            scout = ScoutBotPipeline(
                subreddits = subreddit_list,
                search_queries = search_query_list,
            )
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


@router.get("/extractions")
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
