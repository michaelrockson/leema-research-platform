import re
from typing import Dict, List

from google.genai import errors

from clients.gemini_client import initialize_gemini, \
    provide_agent_tools
from database import get_session
from repositories.brief_repository import BriefRepository
from repositories.post_repository import PostRepository
from repositories.sentiment_repository import SentimentRepository
from settings import settings
from utils.logger import logger
from utils.rate_limiter import gemini_retry


class CoreService:
    """
    Service for querying posts with sentiments,
    executing the curator agent and storing agent responses.
    """


    def __init__(self):
        self.session = get_session()
        self.post_repo = PostRepository(self.session)
        self.sentiment_repo = SentimentRepository(self.session)
        self.brief_repo = BriefRepository(self.session)
        self.agent = initialize_gemini()
        self.post_with_sentiments = []
        self.sources_by_post_number: Dict[int, Dict] = {}
        self.curator_agent_response = None


    def query_posts_with_sentiments(self) -> List[Dict]:
        """
        Call the query_posts_with_sentiments() function to obtain posts and their sentiment analysis results.
        Each record in the returned list contains a post and its sentiment score.
        Use this information to guide your next actions, generate summaries, or perform analysis as required.
        """
        post_records = []

        logger.info("Querying posts with sentiments")

        try:
            posts_with_sentiments = self.post_repo.get_posts_with_sentiments(
                limit = 10)

            for post, sentiment in posts_with_sentiments:
                post_with_sentiments = {
                    "post_number": post.id,
                    "subreddit": post.subreddit,
                    "title": post.title,
                    "body": post.body,
                    "sentiment_score": sentiment.sentiment_results
                }
                post_records.append(post_with_sentiments)
                # Same link the "Source conversations" list used, falling
                # back to the thread permalink when it is missing.
                source_url = post.post_url or (
                    f"https://www.reddit.com/r/{post.subreddit}"
                    f"/comments/{post.submission_id}/"
                )
                self.sources_by_post_number[post.id] = {
                    "url": source_url,
                    "upvotes": post.score or 0,
                    "comments": post.number_of_comments or 0,
                }

            logger.info("Successfully queried posts with sentiments.")

            self.post_with_sentiments = post_records
            return post_records

        except Exception as error:
            logger.error(
                f"Error querying posts with sentiments from the database!:{error}",
                exc_info = True)
            raise RuntimeError(
                f"Failed to query posts with sentiments: {error}") from error


    def execute_curator_agent(self):
        """
        Execute the curator agent to generate a summary or analysis using the Gemini model.

        Quota / rate-limit errors are retried automatically with exponential
        back-off via ``gemini_retry`` before surfacing to the caller.

        Returns:
            str or dict: Curator agent response text or error information.
        """
        try:
            @gemini_retry
            def _call_gemini():
                """Inner wrapper so gemini_retry can target just the API call."""
                return self.agent.models.generate_content(
                    model = settings.AGENT_MODEL,
                    contents = settings.SCOUT_OBJECTIVE,
                    config = provide_agent_tools(
                        tools = [self.query_posts_with_sentiments])
                )


            response = _call_gemini()

            curator_response = response.text

            self.curator_agent_response = curator_response
            return curator_response

        except errors.ServerError as error:
            logger.error(f"Gemini server error: {error}")
            return {
                "error": "Model temporarily unavailable. Please try again later."}

        except errors.ClientError as error:
            if "RESOURCE_EXHAUSTED" in str(error):
                logger.error(
                    "Quota exceeded and all retries exhausted. "
                    "Try again after reset or switch models."
                )
                return {"error": "Quota exceeded"}
            raise

        except Exception as error:
            logger.error(
                f"Unexpected error while running Market Scout Agent: {error}")
            raise RuntimeError(f"Agent terminated due to an error: {error}") from error


    def _resolve_source_links(self, response_text: str) -> str:
        """
        Replace each "SOURCE POST: <post number>" line written by the agent
        with the source post's link, upvotes and comment count. These come
        from the posts the agent was actually given, so the agent never has
        to reproduce them itself. Unknown post numbers are dropped.
        """

        def replace_source(match: re.Match) -> str:
            source = self.sources_by_post_number.get(int(match.group(1)))
            if source is None:
                logger.warning(
                    f"Curator cited unknown post number {match.group(1)}")
                return ""
            return (
                f"SOURCE URL: {source['url']}\n"
                f"SOURCE UPVOTES: {source['upvotes']}\n"
                f"SOURCE COMMENTS: {source['comments']}"
            )

        return re.sub(
            r"SOURCE POST:\s*\"?#?(\d+)\"?",
            replace_source,
            response_text,
            flags = re.IGNORECASE,
        )


    def store_curator_response(self):
        """
        Store the curator agent's response in the ProcessedBriefs table in the database.
        """
        if not self.curator_agent_response:
            logger.info("Running agent for response")
            try:
                self.execute_curator_agent()
            except Exception as error:
                logger.error(
                    f"Failed to run curator agent: {error}", exc_info = True)

        try:
            if self.curator_agent_response is not None:
                self.brief_repo.create_brief(
                    self._resolve_source_links(self.curator_agent_response))

                post_ids = []
                for record in self.post_with_sentiments:
                    post_ids.append(record["post_number"])

                if post_ids:
                    posts = self.post_repo.get_posts_by_ids(post_ids)

                    submission_ids = [post.submission_id for post in posts]

                    self.post_repo.mark_as_curated(post_ids)
                    self.sentiment_repo.mark_as_curated(submission_ids)

                    for sub_id in submission_ids:
                        self.post_repo.add_curated_item(sub_id)

                # Commit the brief even if no posts were marked as curated.
                self.session.commit()
                logger.info("Curator response stored")
            else:
                logger.warning("Curated content is None. Skipping DB insert.")

        except Exception as error:
            self.session.rollback()
            logger.error(
                f"Failed to store curator response and update curation status: {error}",
                exc_info = True)

        finally:
            self.session.close()
