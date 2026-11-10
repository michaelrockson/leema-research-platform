from fastapi import APIRouter, HTTPException

from routers.analysis_router import run_data_analysis
from routers.egress_router import send_report_by_all_channels
from routers.extraction_router import run_extraction
from utils.logger import logger

router = APIRouter(tags = ["Orchestration"])


@router.get("/runallprocesses")
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
