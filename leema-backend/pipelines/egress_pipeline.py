from pipelines.pipeline_result import PipelineResult
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


    def run(self, choice) -> PipelineResult:
        """
        Executes the egress pipeline: query brief and deliver via chosen channels.
        Returns:
            PipelineResult: SUCCESS when delivered, NO_NEW_DATA when there is
            no report to send yet, FAILED when delivery failed.
        """
        try:
            logger.info("Egress pipeline started")
            logger.info("Querying latest processed brief...")
            brief = self.service.query_brief()

            if not brief:
                logger.info("No brief available for egress.")
                return PipelineResult.no_new_data(
                    "There's no report to send yet. Run \"Identify problems\" "
                    "first to generate one.")

            delivered = send_by_channel(
                service = self.service,
                choice = choice,
                notion_only = self.notion_only,
                email_only = self.email_only,
                all_channels = self.all_channels,
            )
            if not delivered:
                logger.error(f"Egress delivery via '{choice}' failed.")
                return PipelineResult.failed(
                    "We couldn't deliver your report.")

            return PipelineResult.success("Report delivered successfully.")

        except Exception as error:
            logger.error(f"Error executing Egress pipeline: {error}",
                         exc_info = True)
            return PipelineResult.failed(
                "Something went wrong while sending your report. Please try "
                "again in a few minutes.")
