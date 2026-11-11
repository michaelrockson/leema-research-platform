from pipelines.pipeline_result import PipelineResult
from services.sentiment_service import SentimentService
from utils.logger import logger


class SentimentPipeline:
    """
    Pipeline responsible for co-ordinating sentiment analysis on stored Reddit data.
    """


    def __init__(self):
        self.service = SentimentService()


    def run(self) -> PipelineResult:
        """
        Executes the sentiment analysis pipeline: query, analyze, summarize, and store.
        Returns:
            PipelineResult: SUCCESS when there are scored posts ready for
            curation, NO_NEW_DATA when there is nothing to analyze, FAILED on error.
        """
        try:

            logger.info("Querying posts with comments...")
            posts = self.service.query_posts_with_comments()

            if not posts:
                if self.service.has_posts_awaiting_curation():
                    logger.info(
                        "No new posts to score; existing scored posts are awaiting curation.")
                    return PipelineResult.success(
                        "Conversations are already analyzed and ready for review.")
                logger.info("No posts available for sentiment analysis.")
                return PipelineResult.no_new_data(
                    "There are no new conversations to analyze yet. Run "
                    "\"Find conversations\" first to collect some.")

            logger.info("Analyzing sentiment...")
            self.service.analyze_post_sentiment()

            logger.info("Summarizing sentiment...")
            self.service.summarize_post_sentiment()

            logger.info("Storing sentiment results...")
            self.service.store_sentiment_results()

            logger.info("Sentiment pipeline complete")
            return PipelineResult.success("Conversations analyzed successfully.")

        except Exception as error:
            logger.error(f"Error in Sentiment Analysis pipeline: {error}",
                         exc_info = True)
            return PipelineResult.failed(
                "Something went wrong while analyzing conversations. Please "
                "try again in a few minutes.")
