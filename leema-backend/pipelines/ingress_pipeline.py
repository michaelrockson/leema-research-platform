from pipelines.pipeline_result import PipelineResult
from services.reddit_service import RedditService
from utils.logger import logger


class IngressPipeline:
    """
    Pipeline responsible for co-ordinating the ingestion of Reddit data.
    """


    def __init__(self):
        self.reddit_service = RedditService()


    def run(self) -> PipelineResult:
        """
        Executes the ingress pipeline: data scraping and storage.
        Returns:
            PipelineResult: SUCCESS when new posts were stored, NO_NEW_DATA when
            there was nothing new to fetch, FAILED on error.
        """
        try:

            logger.info("Scraping data from Reddit...")
            reddit_data = self.reddit_service.run_reddit_scraper()

            if not reddit_data or not reddit_data.get("posts"):
                logger.info("No new data fetched from Reddit.")
                return PipelineResult.no_new_data(
                    "No new conversations to collect. Everything found has "
                    "already been saved.")

            self.reddit_service.run_reddit_storage(reddit_data)

            return PipelineResult.success(
                "New conversations collected successfully.")

        except Exception as error:
            logger.error(f"Error executing Ingress pipeline: {error}",
                         exc_info = True)
            return PipelineResult.failed(
                "Something went wrong while collecting conversations from "
                "Reddit. Please try again in a few minutes.")
