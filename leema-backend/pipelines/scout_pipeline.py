from typing import List, Optional

from pipelines.pipeline_result import PipelineResult
from services.scout_bot_service import ScoutBotService
from utils.logger import logger


class ScoutBotPipeline:
    """
    Pipeline responsible for scouting and validating potential pain points from Reddit.
    This is the first stage in the system, identifying software-solvable problems.
    """


    def __init__(self, subreddits: Optional[List[str]] = None,
                 search_queries: Optional[List[str]] = None):
        self.service = ScoutBotService(subreddits = subreddits,
                                       search_queries = search_queries)


    def run(self) -> PipelineResult:
        """
        Executes the scouting pipeline:
        Agent validates and stores IDs in the database.
        Returns:
            PipelineResult: SUCCESS when there are validated posts waiting for
            ingress, NO_NEW_DATA when everything found was already collected,
            FAILED on error.
        """
        try:
            self.service.agent_validate_posts()

            if not self.service.has_unprocessed_posts():
                logger.info(
                    "Scout found no new posts to collect (all matches were already "
                    "validated and processed in earlier runs).")
                return PipelineResult.no_new_data(
                    "No new conversations found. Everything matching your "
                    "communities and signals has already been collected. "
                    "Try again later, or add more communities or signals in Settings.")

            return PipelineResult.success("Found new conversations to collect.")

        except Exception as error:
            logger.error(f"Error in Scout Bot pipeline: {error}",
                         exc_info = True)
            return PipelineResult.failed(
                "Something went wrong while searching Reddit. Please try again "
                "in a few minutes.")
