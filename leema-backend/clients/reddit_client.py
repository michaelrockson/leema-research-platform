import asyncio

import asyncpraw
from dotenv import load_dotenv

from settings import settings
from utils.logger import logger

_reddit_instance = None
_reddit_lock = None


def _get_lock() -> asyncio.Lock:
    """
    Returns the module-level asyncio Lock, creating it lazily inside a running
    event loop so it is always bound to the correct loop.
    """
    global _reddit_lock
    if _reddit_lock is None:
        _reddit_lock = asyncio.Lock()
    return _reddit_lock


def _validate_reddit_secrets(reddit_secrets: dict) -> bool:
    """
    Validates the Reddit secrets.

    Args:
        reddit_secrets (dict): Dictionary containing Reddit secrets.

    Returns:
        bool: True if the Reddit secrets are valid, False otherwise.
    """
    missing_keys = []
    found_keys = []

    for reddit_key, reddit_value in reddit_secrets.items():
        if reddit_value:
            found_keys.append(reddit_key)
        else:
            missing_keys.append(reddit_key)

    if missing_keys:
        logger.error(
            f"Failed to load {len(missing_keys)} Reddit environment variable(s)")
        for key in missing_keys:
            logger.info(f"Missing Reddit environment variable: {key}")
        return False

    if found_keys:
        logger.info(
            f" {len(found_keys)} Reddit environment variables were loaded successfully")

    return True


def _create_reddit_client() -> asyncpraw.Reddit | None:
    """
    Creates a new asyncpraw Reddit client instance.
    Construction is synchronous; network I/O only happens when methods are awaited.

    Returns:
        asyncpraw.Reddit | None: The Reddit client instance, or None on failure.
    """
    load_dotenv()

    client_id = settings.REDDIT_CLIENT_ID
    client_secret = settings.REDDIT_CLIENT_SECRET
    user_agent = settings.REDDIT_USER_AGENT

    reddit_secrets = {
        "REDDIT_CLIENT_ID": client_id,
        "REDDIT_CLIENT_SECRET": client_secret,
        "REDDIT_USER_AGENT": user_agent,
    }

    if not _validate_reddit_secrets(reddit_secrets):
        logger.error(
            "Connection to the Reddit API failed due to missing environment variable(s)")
        return None

    try:
        reddit = asyncpraw.Reddit(
            client_id = client_id,
            client_secret = client_secret,
            user_agent = user_agent,
        )
        logger.info("asyncpraw Reddit client created successfully.")
        return reddit

    except Exception as error:
        logger.exception(f"Failed to initialize Reddit client: {error}")
        return None


async def get_reddit_client() -> asyncpraw.Reddit | None:
    """
    Returns the asyncpraw Reddit client singleton.
    Creates it on first call; subsequent calls return the cached instance.

    Returns:
        asyncpraw.Reddit | None: The Reddit client instance.
    """
    global _reddit_instance

    async with _get_lock():
        if _reddit_instance is None:
            logger.info("Creating new asyncpraw Reddit client instance.")
            _reddit_instance = _create_reddit_client()
        else:
            logger.info("Returning existing asyncpraw Reddit client instance.")

    return _reddit_instance


async def close_reddit_client() -> None:
    """
    Closes the asyncpraw Reddit client and resets the singleton.
    Must be called at the end of each pipeline's async context to release the
    underlying aiohttp session cleanly.
    """
    global _reddit_instance, _reddit_lock

    if _reddit_instance is not None:
        try:
            await _reddit_instance.close()
            logger.info("asyncpraw Reddit client closed.")
        except Exception as error:
            logger.warning(f"Error while closing Reddit client: {error}")
        finally:
            _reddit_instance = None
            _reddit_lock = None
