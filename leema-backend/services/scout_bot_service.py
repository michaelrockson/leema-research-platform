import asyncio
from typing import List, Dict

from google.genai import errors
from nltk.sentiment import SentimentIntensityAnalyzer

from clients.gemini_client import initialize_gemini, \
    provide_agent_tools
from clients.reddit_client import get_reddit_client, \
    close_reddit_client
from database import get_session
from database.models import ValidatedPost
from settings import settings
from utils.helpers import search_one, combine_search_queries
from utils.logger import logger
from utils.rate_limiter import batched_gather, gemini_retry


class ScoutBotService:
    """
        Service for scouting Reddit posts that express user pain points.

        Searches configured subreddits using predefined queries, filters posts
        by engagement thresholds (score, comments, upvote ratio) and classifies
        them by sentiment using VADER. Only negative posts are retained for
        downstream processing.
    """


    def __init__(self, subreddits: List[str] = None,
                 search_queries: List[str] = None):
        self.subreddits = subreddits or settings.DEFAULT_SUBREDDITS
        raw_queries = search_queries or settings.SEARCH_QUERIES
        # Combine search queries into boolean OR groups to reduce API round-trips by up to 90%
        self.search_queries = combine_search_queries(raw_queries,
                                                     chunk_size = 8)
        self.min_score = settings.MIN_SCORE
        self.min_comments = settings.MIN_COMMENTS
        self.min_upvote_ratio = settings.MIN_UPVOTE_RATIO
        self.reddit = None
        self.session = get_session()
        self.sia = SentimentIntensityAnalyzer()
        self.gemini = initialize_gemini()
        self.search_results = []
        self.search_result_sentiments = []


    async def _search_all_async(self) -> List[List[Dict]]:
        """
        Fans out all subreddit/query combinations via ``batched_gather()``
        (controlled batches with inter-batch delays) rather than a raw
        ``asyncio.gather(*all_coros)`` to prevent overwhelming Reddit's
        rate limits.

        Each individual ``search_one`` coroutine is itself decorated with
        ``@reddit_retry`` and guarded by the ``reddit_limiter`` semaphore +
        token-bucket, providing three layers of protection.

        Closes the asyncpraw client in a finally block.

        Returns:
            List[List[Dict]]: Nested list where each inner list contains post dicts
            for a single subreddit/query pair.
        """
        self.reddit = await get_reddit_client()

        try:
            coros = []
            for subreddit in self.subreddits:
                for query in self.search_queries:
                    coros.append(search_one(
                        self.reddit,
                        subreddit,
                        query,
                        self.min_upvote_ratio,
                        self.min_score,
                        self.min_comments
                    ))

            logger.info(
                f"Searching {len(coros)} subreddit/query pair(s) in batches of "
                f"{settings.REDDIT_BATCH_SIZE} (delay: {settings.REDDIT_BATCH_DELAY}s)."
            )

            # Use batched_gather instead of asyncio.gather to avoid firing
            # all coroutines simultaneously — the token-bucket rate limiter
            # inside each search_one call handles per-request throttling.
            raw_results = await batched_gather(
                coros,
                batch_size = settings.REDDIT_BATCH_SIZE,
                batch_delay = settings.REDDIT_BATCH_DELAY,
            )

            search_results_list = []
            for result in raw_results:
                if isinstance(result, Exception):
                    logger.error(f"A search task failed: {result}")
                    search_results_list.append([])
                else:
                    search_results_list.append(result)

            self.search_results = search_results_list
            logger.info(
                f"Searching subreddits complete! {len(search_results_list)} active indexes"
            )
            return search_results_list

        except RuntimeError as e:
            logger.error("Reddit instance check failed: %s", e)
            return []

        except Exception as e:
            logger.error(
                f"Unexpected error while querying Reddit API: {e}",
                exc_info = True
            )
            return []

        finally:
            await close_reddit_client()
            self.reddit = None


    def search_subreddit(self) -> List[List[Dict]]:
        """
        Searches configured subreddits using predefined queries and stores the results.
        Results are grouped by subreddit/query combination.

        This is the sync entry point used by analyze_search_results() and the
        scout pipeline. Delegates all I/O to _search_all_async() via asyncio.run().

        Returns:
            List[List[Dict]]: Nested list where each inner list contains post dicts
            for a single subreddit/query pair.
        """
        return asyncio.run(self._search_all_async())


    def analyze_search_results(self) -> List[List[Dict[str, str]]]:
        """
        Analyzes search results and filters posts by negative sentiment.
        Triggers a fresh subreddit search if no results are currently stored.

         Returns:
            List[List[Dict[str, str]]]: A nested list where each inner list contains
            a single dict representing a negative post with keys or an empty list if no search results are found or an exception occurs.
        """
        try:
            if not self.search_results:
                logger.info(
                    "No search search results available! Searching for results....")
                self.search_subreddit()

                if not self.search_results:
                    logger.error(
                        "Search returned no results. Aborting analysis.")
                    return []

            logger.info(
                f"Starting sentiment analysis on {len(self.search_results)} index batches.")
            sentiment_collection: List[List[Dict[str, str]]] = []

            skipped_posts = 0

            for indexes in self.search_results:
                for results in indexes:
                    result_batches: List[Dict] = []
                    score: Dict[str, float] = self.sia.polarity_scores(
                        results.get("post_content", "Unknown"))

                    if score["compound"] > 0.05:
                        post_sentiment = "Positive"
                        skipped_posts += 1
                    elif score["compound"] < -0.05:
                        post_sentiment = "Negative"
                    else:
                        post_sentiment = "Neutral"
                        skipped_posts += 1

                    if post_sentiment == "Negative":
                        result_batches.append(
                            {"subreddit": results["subreddit"],
                             "search_query": results["search_query"],
                             "post_id": results["post_id"],
                             "post_title": results["post_title"],
                             "post_content": results["post_content"],
                             "post_sentiment": post_sentiment})
                        sentiment_collection.append(result_batches)

            total_found = len(sentiment_collection)
            if total_found > settings.MAX_SCOUT_RESULTS:
                logger.warning(
                    f"Scout results capped: {total_found} negative posts found, "
                    f"truncating to {settings.MAX_SCOUT_RESULTS} to stay within "
                    f"free-tier token limits."
                )
                sentiment_collection = sentiment_collection[
                    :settings.MAX_SCOUT_RESULTS]

            logger.info(
                f"Analysis complete. {len(sentiment_collection)} negative posts retained "
                f"({skipped_posts} skipped, {total_found} total found)."
            )
            self.search_result_sentiments = sentiment_collection
            return sentiment_collection

        except Exception as e:
            logger.error(f"Error analyzing search results: {e}",
                         exc_info = True)
            return []


    def agent_validate_posts(self) -> Dict[str, str] | None:
        """
        Runs the Gemini agent to dynamically evaluate negative-sentiment posts
        and determine which ones describe problems solvable by software.

        Quota / rate-limit errors are retried automatically with exponential
        back-off via ``gemini_retry`` before surfacing to the caller.

        Returns:
            str: The agent's final summary response.
        """
        try:
            if not self.gemini:
                self.gemini = initialize_gemini()

            logger.info(
                "Agent validate posts: starting Gemini agentic session.")


            @gemini_retry
            def _call_gemini():
                """Inner wrapper so gemini_retry can target just the API call."""
                return self.gemini.models.generate_content(
                    model = settings.SCOUT_MODEL,
                    contents = settings.AGENT_VALIDATE_POSTS_OBJECTIVE,
                    config = provide_agent_tools(
                        tools = [self.analyze_search_results,
                                 self.store_validated_posts]
                    )
                )


            response = _call_gemini()

            agent_response = response.text
            logger.info("Agent validate posts: session complete.")
            logger.info(f"{agent_response}")
            return agent_response

        except errors.ServerError as e:
            logger.error(f"Gemini server error: {e}")
            return {
                "error": "Model temporarily unavailable. Please try again later."}

        except errors.ClientError as e:
            if "RESOURCE_EXHAUSTED" in str(e):
                logger.error(
                    "Quota exceeded and all retries exhausted. "
                    "Try again after reset or switch models."
                )
                return {"error": "Quota exceeded"}
            raise

        except Exception as e:
            logger.error(
                f"Unexpected error while running Gemini validation agent {e}")
            raise RuntimeError(f"Agent terminated due to an error: {e}")


    def store_validated_posts(self, post_ids: List[str]) -> Dict:
        """
        Persists a list of validated post IDs to the `validated_posts` table,
        staging them for downstream processing.

        Args:
            post_ids (List[str]): Reddit submission IDs identified by the agent
                                  as software-solvable problems.

        Returns:
            Dict: A summary with the count of newly stored IDs and any that were
                  already present (skipped).
        """
        if not post_ids:
            logger.warning(
                "store_validated_posts called with an empty list. Nothing to store.")
            return {"stored": 0, "skipped": 0}

        stored = 0
        skipped = 0

        try:
            existing_ids = set()

            rows = self.session.query(ValidatedPost.submission_id).filter(
                ValidatedPost.submission_id.in_(post_ids)
            ).all()

            for row in rows:
                existing_ids.add(row.submission_id)

            for post_id in post_ids:
                if post_id in existing_ids:
                    logger.info(
                        f"Post '{post_id}' already in validated_posts skipping.")
                    skipped += 1
                    continue

                self.session.add(ValidatedPost(submission_id = post_id))
                stored += 1
                logger.info(f"Post '{post_id}' staged in validated_posts.")

            self.session.commit()
            logger.info(
                f"store_validated_posts complete: {stored} stored, {skipped} skipped."
            )

        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to store validated posts: {e}",
                         exc_info = True)
            return {"stored": 0, "skipped": 0}

        finally:
            self.session.close()

        return {"stored": stored, "skipped": skipped}


    def has_unprocessed_posts(self) -> bool:
        """
        Checks if there are any validated posts in the database that have
        not yet been processed by the ingress pipeline.

        Returns:
            bool: True if unprocessed posts exist, False otherwise.
        """
        try:
            count = self.session.query(ValidatedPost).filter(
                ValidatedPost.is_processed == False
            ).count()
            return count > 0
        except Exception as e:
            logger.error(
                f"Error checking for unprocessed validated posts: {e}")
            return False
        finally:
            self.session.close()
