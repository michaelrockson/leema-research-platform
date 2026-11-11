import sys

from database.init_db import init_db
from pipelines.core_pipeline import CorePipeline
from pipelines.egress_pipeline import EgressPipeline
from pipelines.ingress_pipeline import IngressPipeline
from pipelines.scout_pipeline import ScoutBotPipeline
from pipelines.sentiment_pipeline import SentimentPipeline
from settings import settings
from utils.helpers import run_pipeline
from utils.logger import logger

if __name__ == "__main__":
    logger.info("Initializing database...")
    init_db()

    scout = ScoutBotPipeline()
    ingress = IngressPipeline()
    sentiment = SentimentPipeline()
    core = CorePipeline()
    egress = EgressPipeline()

    pipelines = [scout, ingress, sentiment, core, egress]

    for pipeline in pipelines:
        if isinstance(pipeline, EgressPipeline):
            result = run_pipeline(pipeline, settings.CHOICE_THREE)
        else:
            result = run_pipeline(pipeline)

        if result.has_failed:
            sys.exit(1)

        if result.has_no_new_data:
            logger.info(f"Stopping early: {result.message}")
            sys.exit(0)

    logger.info("Full pipeline execution successful.")
    sys.exit(0)
