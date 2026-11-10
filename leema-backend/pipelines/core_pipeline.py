from services.core_service import CoreService
from utils.logger import logger


class CorePipeline:
    """
    Pipeline responsible for co-ordinating the AI curation process.
    """


    def __init__(self):
        self.service = CoreService()


    def run(self):
        """
        Executes the core curation pipeline: execute agent and store response.
        Returns:
            bool: True if the pipeline succeeded and found data, False otherwise.
        """
        try:
            logger.info("Core Curation pipeline started")

            logger.info("Executing Curator Agent...")
            response = self.service.execute_curator_agent()

            if not response or (
                isinstance(response, dict) and "error" in response):
                logger.warning(
                    "Curator agent failed to generate a brief. Stopping pipeline.",
                    exc_info = True)
                return False

            logger.info("Storing curator response...")
            self.service.store_curator_response()

            logger.info("Core Curation pipeline complete")
            return True

        except Exception as error:
            logger.error(f"Error executing Core Curation pipeline: {error}",
                         exc_info = True)
            return False
