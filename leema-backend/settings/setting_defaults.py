from typing import Any, Dict

from settings import settings

SETTING_DEFAULTS: Dict[str, Any] = {
    "communities": settings.DEFAULT_SUBREDDITS,
    "signals": settings.SEARCH_QUERIES,
    "conversations_per_community": settings.DEFAULT_POST_LIMIT,
    "replies_per_conversation": settings.DEFAULT_COMMENT_LIMIT,
    "max_scout_results": settings.MAX_SCOUT_RESULTS,
    "min_comments": settings.MIN_COMMENTS,
    "min_score": settings.MIN_SCORE,
    "min_upvote_ratio": settings.MIN_UPVOTE_RATIO,
    "recipient_address": settings.RECIPIENT_ADDRESS or "",
    "notion_database_id": settings.NOTION_DB_ID or "",
    "agent_model": settings.AGENT_MODEL,
    "scout_model": settings.SCOUT_MODEL,
    "reddit_max_requests_per_min": settings.REDDIT_MAX_REQUESTS_PER_MIN,
    "reddit_max_concurrency": settings.REDDIT_MAX_CONCURRENCY,
    "reddit_batch_size": settings.REDDIT_BATCH_SIZE,
    "reddit_batch_delay": settings.REDDIT_BATCH_DELAY,
    "reddit_max_retries": settings.REDDIT_MAX_RETRIES,
    "gemini_max_requests_per_min": settings.GEMINI_MAX_REQUESTS_PER_MIN,
    "gemini_max_concurrency": settings.GEMINI_MAX_CONCURRENCY,
    "gemini_max_retries": settings.GEMINI_MAX_RETRIES,
}

EDITABLE_SETTING_FIELDS = tuple(SETTING_DEFAULTS.keys())
