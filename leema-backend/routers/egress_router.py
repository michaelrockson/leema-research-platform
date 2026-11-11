from fastapi import APIRouter, HTTPException

from pipelines.egress_pipeline import EgressPipeline
from settings import settings
from utils.helpers import run_pipeline
from utils.logger import logger

router = APIRouter(tags = ["Egress"])


def _execute_egress(choice: str, channel_name: str):
    try:
        logger.info(
            f"Phase 3: Starting Egress pipeline for channel: {channel_name}..."
        )
        result = run_pipeline(EgressPipeline(), choice)

        if result.has_failed:
            raise HTTPException(
                status_code = 500,
                detail = f"Couldn't send via {channel_name}. {result.message}",
            )

        if result.succeeded:
            logger.info(f"Phase 3: Sent report via {channel_name}.")
            message = f"Report sent via {channel_name}."
            delivery_status = "DELIVERED"
        else:
            message = result.message
            delivery_status = "NOTHING_TO_SEND"

        return {
            "phase": "egress",
            "success": True,
            "status": result.status.value,
            "message": message,
            "data": {
                "channel": channel_name,
                "status": delivery_status,
            },
        }
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Failed to send reports by {channel_name}: {error}",
                     exc_info = True)
        raise HTTPException(
            status_code = 500,
            detail = f"Something went wrong while sending via {channel_name}. "
                     f"Please try again in a few minutes.",
        )


@router.get("/sendallchannels")
def send_report_by_all_channels():
    """Phase 3: Deliver reports via Notion and Email."""
    return _execute_egress(settings.CHOICE_THREE, "All Channels")


@router.get("/sendbyemail")
def send_report_by_email():
    """Phase 3: Deliver reports via Email only."""
    return _execute_egress(settings.CHOICE_TWO, "Email")


@router.get("/sendbynotion")
def send_report_by_notion():
    """Phase 3: Deliver reports via Notion only."""
    return _execute_egress(settings.CHOICE_ONE, "Notion")
