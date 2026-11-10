from services.reddit_service import RedditService
from utils.logger import logger


class IngressPipeline:
    """
    Pipeline responsible for co-ordinating the ingestion of Reddit data.
    """


    def __init__(self):
        self.reddit_service = RedditService()


    def run(self):
        """
        Executes the ingress pipeline: data scraping and storage.
        Returns:
            bool: True if the pipeline succeeded and found data, False otherwise.
        """
        try:

            logger.info("Scraping data from Reddit...")
            reddit_data = self.reddit_service.run_reddit_scraper()

            if not reddit_data or not reddit_data.get("posts"):
                logger.warning(
                    "No new data fetched from Reddit. Stopping pipeline.")
                return False

            self.reddit_service.run_reddit_storage(reddit_data)

            return True

        except Exception as error:
            logger.error(f"Error executing Ingress pipeline: {error}",
                         exc_info = True)
            return False
