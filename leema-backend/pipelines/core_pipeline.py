from pipelines.pipeline_result import PipelineResult
from services.core_service import CoreService
from utils.logger import logger


class CorePipeline:
    """
    Pipeline responsible for co-ordinating the AI curation process.
    """


    def __init__(self):
        self.service = CoreService()


    def run(self) -> PipelineResult:
        """
        Executes the core curation pipeline: execute agent and store response.
        Returns:
            PipelineResult: SUCCESS when a brief was generated and stored,
            FAILED otherwise.
        """
        try:
            logger.info("Core Curation pipeline started")

            logger.info("Executing Curator Agent...")
            response = self.service.execute_curator_agent()

            if isinstance(response, dict) and "error" in response:
                logger.warning(
                    f"Curator agent failed to generate a brief: {response['error']}")
                return PipelineResult.failed(
                    f"The AI couldn't write your report right now "
                    f"({response['error']}). Please try again shortly.")

            if not response:
                logger.warning("Curator agent returned an empty brief.")
                return PipelineResult.failed(
                    "The AI didn't return a report this time. Please try again.")

            logger.info("Storing curator response...")
            self.service.store_curator_response()

            logger.info("Core Curation pipeline complete")
            return PipelineResult.success("Report generated successfully.")

        except Exception as error:
            logger.error(f"Error executing Core Curation pipeline: {error}",
                         exc_info = True)
            return PipelineResult.failed(
                "Something went wrong while generating your report. Please "
                "try again in a few minutes.")
