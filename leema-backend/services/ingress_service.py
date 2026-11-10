from typing import Dict, List, Any

from clients.reddit_client import get_reddit_client
from database import get_session
from repositories.validated_post_repository import \
    ValidatedPostRepository
from settings import settings
from utils.helpers import get_comments_from_submission, \
    get_post_by_id
from utils.logger import logger
from utils.rate_limiter import batched_gather


class IngressService:
    """
    Service for handling Reddit data ingestion, focused on fetching posts
    that have been validated by the scout bot and retrieving their comments.

    All Reddit I/O methods are async coroutines. The sync bridge lives in
    RedditService.run_reddit_scraper() via asyncio.run().
    """


    def __init__(self):
        self.reddit = None
        self.validated_repo = ValidatedPostRepository()
        self.session = get_session()
        self.comment_limit = settings.DEFAULT_COMMENT_LIMIT
        self.posts = []
        self.submission_ids = []
        self.comments = []


    async def _ensure_reddit(self) -> None:
        """Lazily acquires the asyncpraw Reddit singleton if not already set."""
        if not self.reddit:
            self.reddit = await get_reddit_client()


    async def fetch_validated_posts(self) -> List[Dict[str, Any]]:
        """
        Reads unprocessed submission IDs from the `validated_posts` table,
        then fetches every post's full data from the Reddit API concurrently
        using asyncio.gather().

        Marks fetched records as processed so they are not picked up again on
        the next run.

        Returns:
            List[Dict[str, Any]]: List of post data dicts for validated submissions.
        """
        await self._ensure_reddit()

        try:
            validated_repo = ValidatedPostRepository()
            unprocessed = validated_repo.get_unprocessed()

            if not unprocessed:
                logger.warning(
                    "fetch_validated_posts: no unprocessed validated posts found.")
                return []

            submission_ids = []
            for record in unprocessed:
                submission_ids.append(record.submission_id)

            logger.info(
                f"fetch_validated_posts: {len(submission_ids)} validated IDs to scrape: {submission_ids}"
            )

            coros = []
            for submission_id in submission_ids:
                coros.append(get_post_by_id(self.reddit, submission_id))

            logger.info(
                f"fetch_validated_posts: fetching {len(coros)} post(s) in "
                f"batches of {settings.REDDIT_BATCH_SIZE}."
            )

            # batched_gather keeps concurrent Reddit requests within the
            # rate limiter's concurrency cap; get_post_by_id is individually
            # guarded by reddit_limiter + reddit_retry.
            raw_results = await batched_gather(
                coros,
                batch_size = settings.REDDIT_BATCH_SIZE,
                batch_delay = settings.REDDIT_BATCH_DELAY,
            )

            posts = []
            processed_ids = []

            for i, result in enumerate(raw_results):
                if isinstance(result, Exception):
                    logger.error(
                        f"Failed to fetch submission '{submission_ids[i]}': {result}",
                        exc_info = True
                    )
                else:
                    posts.append(result)
                    processed_ids.append(submission_ids[i])

            if processed_ids:
                validated_repo.mark_as_processed(processed_ids)
                self.session.commit()
                logger.info(
                    f"fetch_validated_posts: marked {len(processed_ids)} record(s) as processed."
                )

            self.posts = posts
            logger.info(
                f"fetch_validated_posts: collected {len(posts)} post(s).")
            return posts

        except Exception as e:
            self.session.rollback()
            logger.error(f"fetch_validated_posts failed: {e}", exc_info = True)
            return []

        finally:
            self.session.close()


    def fetch_post_ids(self) -> List[str]:
        """
        Extract submission IDs from the fetched posts.
        Returns:
            List[str]: List of submission IDs.
        """
        if not self.posts:
            logger.warning(
                "No posts available. Run fetch_validated_posts() first.")

        submission_ids = []

        for post in self.posts:
            if "submission_id" in post:
                submission_ids.append(post["submission_id"])

        self.submission_ids = submission_ids
        logger.info(f"Extracted {len(submission_ids)} submission IDs.")
        return submission_ids


    async def fetch_reddit_comments(self) -> List[Dict[str, Any]]:
        """
        Fetch comments for every submission ID concurrently using asyncio.gather().
        Returns:
            List[Dict[str, Any]]: List of comment data dictionaries.
        """
        if not self.submission_ids:
            logger.warning(
                "No submission IDs available. Running fetch_post_ids()...")
            self.fetch_post_ids()

        logger.info(
            f"Fetching comments from {len(self.submission_ids)} submissions concurrently...")

        coros = []
        for submission_id in self.submission_ids:
            coros.append(
                get_comments_from_submission(
                    self.reddit, submission_id, self.comment_limit
                )
            )

        logger.info(
            f"fetch_reddit_comments: fetching comments for {len(coros)} submission(s) "
            f"in batches of {settings.REDDIT_BATCH_SIZE}."
        )

        # batched_gather keeps concurrent Reddit requests within the
        # rate limiter's concurrency cap; get_comments_from_submission is
        # individually guarded by reddit_limiter + reddit_retry.
        raw_results = await batched_gather(
            coros,
            batch_size = settings.REDDIT_BATCH_SIZE,
            batch_delay = settings.REDDIT_BATCH_DELAY,
        )

        comments_collected = []

        for i, result in enumerate(raw_results):
            if isinstance(result, Exception):
                logger.error(
                    f"Error fetching comments for submission {self.submission_ids[i]}: {result}",
                    exc_info = True
                )
            else:
                for comment in result:
                    comments_collected.append(comment)

        self.comments = comments_collected
        logger.info(f"Collected {len(comments_collected)} comments")
        return comments_collected
