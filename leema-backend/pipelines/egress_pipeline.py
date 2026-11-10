from services.egress_service import EgressService
from settings import settings
from utils.helpers import send_by_channel
from utils.logger import logger


class EgressPipeline:
    """
    Pipeline responsible for co-ordinating the delivery of processed reports.
    """


    def __init__(self):
        self.service = EgressService()
        self.notion_only = settings.CHOICE_ONE
        self.email_only = settings.CHOICE_TWO
        self.all_channels = settings.CHOICE_THREE


    def run(self, choice):
        """
        Executes the egress pipeline: query brief and deliver via chosen channels.
        Returns:
            bool: True if the pipeline succeeded, False otherwise.
        """
        try:
            logger.info("Egress pipeline started")
            logger.info("Querying latest processed brief...")
            brief = self.service.query_brief()

            if not brief:
                logger.error(
                    "No brief available for egress. Stopping pipeline.")
                return False

            delivered = send_by_channel(
                service = self.service,
                choice = choice,
                notion_only = self.notion_only,
                email_only = self.email_only,
                all_channels = self.all_channels,
            )
            if not delivered:
                logger.error(f"Egress delivery via '{choice}' failed.")
            return delivered

        except Exception as error:
            logger.error(f"Error executing Egress pipeline: {error}",
                         exc_info = True)
            return False
