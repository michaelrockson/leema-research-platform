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
        egress = EgressPipeline()
        status = run_pipeline(egress, choice)
        if not status:
            raise RuntimeError(
                f"Egress delivery failed for channel '{channel_name}'. Check that a processed brief exists "
                f"and that the channel's credentials are configured; see server logs for details."
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
    except Exception as error:
        logger.error(f"Failed to send reports by {channel_name}: {error}")
        raise HTTPException(
            status_code = 500,
            detail = f"Egress phase failed for {channel_name}: {error}",
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
