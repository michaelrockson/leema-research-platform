from dataclasses import dataclass
from typing import List

from database import get_session
from repositories.settings_repository import SettingsRepository
from settings.setting_defaults import SETTING_DEFAULTS
from utils.logger import logger


@dataclass(frozen = True)
class RuntimeSettings:
    """
    The settings a pipeline run should use: values saved from the settings
    panel, with settings.py defaults for anything not saved.
    """
    communities: List[str]
    signals: List[str]
    conversations_per_community: int
    replies_per_conversation: int
    max_scout_results: int
    min_comments: int
    min_score: int
    min_upvote_ratio: float
    recipient_address: str
    notion_database_id: str
    agent_model: str
    scout_model: str
    reddit_max_requests_per_min: int
    reddit_max_concurrency: int
    reddit_batch_size: int
    reddit_batch_delay: float
    reddit_max_retries: int
    gemini_max_requests_per_min: int
    gemini_max_concurrency: int
    gemini_max_retries: int


def load_runtime_settings() -> RuntimeSettings:
    """
    Read the saved settings from the database. Falls back to the settings.py
    defaults when the database cannot be reached.
    """
    session = get_session()
    try:
        saved_values = SettingsRepository(session).get_settings() \
            .to_settings_values()
        return RuntimeSettings(**saved_values)
    except Exception as error:
        logger.error(
            f"Could not load saved settings, using defaults: {error}")
        return RuntimeSettings(**SETTING_DEFAULTS)
    finally:
        session.close()
