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


def _serialize_post(post) -> dict:
    return {
        "id": post.id,
        "submission_id": post.submission_id,
        "subreddit": post.subreddit,
        "title": post.title,
        "score": post.score,
        "number_of_comments": post.number_of_comments,
        "post_url": post.post_url,
    }


def _load_recent_posts(limit: int = 20):
    """
    Returns the total number of stored posts and the most recent ``limit`` of
    them, serialized for the API.
    """
    session = get_session()
    try:
        posts = PostRepository(session).get_all_posts()
        return len(posts), [_serialize_post(post) for post in posts[-limit:]]
    finally:
        session.close()


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
                subreddit.strip().replace("r/", "")
                for subreddit in subreddits.split(",")
                if subreddit.strip()
            ]
        elif active_settings and active_settings.communities:
            subreddit_list = active_settings.communities
        else:
            subreddit_list = settings.DEFAULT_SUBREDDITS

        if queries:
            search_query_list = [
                query.strip() for query in queries.split(",") if query.strip()
            ]
        elif active_settings and active_settings.signals:
            search_query_list = active_settings.signals
        else:
            search_query_list = settings.SEARCH_QUERIES

        scout = ScoutBotPipeline(
            subreddits = subreddit_list,
            search_queries = search_query_list,
        )
        final_result = run_pipeline(scout)

        # Only fetch full discussions when the scout actually queued new posts.
        if final_result.succeeded:
            final_result = run_pipeline(IngressPipeline())

        if final_result.has_failed:
            raise HTTPException(status_code = 500,
                                detail = final_result.message)

        total_count, extracted_items = _load_recent_posts()

        logger.info(
            f"Phase 1: Extraction finished ({final_result.status.value}).")
        return {
            "phase": "extraction",
            "success": True,
            "status": final_result.status.value,
            "message": final_result.message,
            "data": {
                "total_posts_extracted": total_count,
                "recent_posts": extracted_items,
            },
        }
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Failed to run extraction process: {error}",
                     exc_info = True)
        raise HTTPException(
            status_code = 500,
            detail = "Something went wrong while finding conversations. "
                     "Please try again in a few minutes.",
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
            subreddit.strip().replace("r/", "")
            for subreddit in subreddits.split(",")
            if subreddit.strip()
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
            final_result = await asyncio.to_thread(run_pipeline, scout)
            if final_result.has_failed:
                yield f"data: {json.dumps({'type': 'error', 'message': final_result.message})}\n\n"
                return

            if final_result.has_no_new_data:
                yield f"data: {json.dumps({'type': 'info', 'stage': 'scout', 'message': final_result.message})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'status', 'stage': 'ingress', 'message': 'Fetching full discussions and comments...'})}\n\n"
                await asyncio.sleep(0.05)

                final_result = await asyncio.to_thread(run_pipeline,
                                                       IngressPipeline())
                if final_result.has_failed:
                    yield f"data: {json.dumps({'type': 'error', 'message': final_result.message})}\n\n"
                    return

            _, recent_posts = _load_recent_posts()

            # Stream each discovered post as an individual chunk
            for post in recent_posts:
                yield f"data: {json.dumps({'type': 'post_chunk', 'data': post})}\n\n"
                await asyncio.sleep(0.02)

            yield f"data: {json.dumps({'type': 'complete', 'success': True, 'status': final_result.status.value, 'message': final_result.message, 'total': len(recent_posts)})}\n\n"

        except Exception as error:
            logger.error(f"Error in extraction stream: {error}", exc_info = True)
            yield f"data: {json.dumps({'type': 'error', 'message': 'Something went wrong while finding conversations. Please try again in a few minutes.'})}\n\n"


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
                "posts": [_serialize_post(post) for post in posts],
            },
        }
    finally:
        session.close()
