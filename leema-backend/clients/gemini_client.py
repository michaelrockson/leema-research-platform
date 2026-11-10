from google import genai
from google.genai import types

from settings import settings
from utils.logger import logger

_gemini_instance = None


def initialize_gemini() -> genai.Client:
    """
    Returns the Gemini client singleton.

    Creates the client on the first call using the configured API key and
    caches it for all subsequent calls. This prevents redundant initializations
    when multiple services (e.g. ScoutBotService, CoreService) call this
    function during the same pipeline run.

    Returns:
        genai.Client: The initialized Gemini client.

    Raises:
        RuntimeError: If the API key is missing or client construction fails.
    """
    global _gemini_instance

    if _gemini_instance is not None:
        logger.debug("Returning existing Gemini client instance.")
        return _gemini_instance

    api_key = settings.GEMINI_API_KEY

    if not api_key:
        logger.error("GEMINI_API_KEY not found in environment variables.")
        raise RuntimeError(
            "Please set your GEMINI_API_KEY to initialize the agent.")

    try:
        _gemini_instance = genai.Client(api_key = api_key)
        logger.info("Gemini client initialized successfully. Agent is ready.")
        return _gemini_instance

    except Exception as error:
        logger.exception(f"Failed to initialize Gemini client: {error}")
        raise RuntimeError(
            "Gemini initialization failed. Check your API key and SDK setup."
        ) from error


def provide_agent_tools(tools) -> types.GenerateContentConfig | None:
    """
    Provides the agent tools configuration.
    """
    try:
        config = types.GenerateContentConfig(tools = tools)
        logger.info(
            f"Agent tools configured successfully with {len(tools)} tool(s).")
        return config

    except Exception as error:
        logger.exception(f"Failed to configure agent tools: {error}")
        return None
