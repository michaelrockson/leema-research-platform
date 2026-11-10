import asyncio
from typing import Dict, Any

from clients.reddit_client import close_reddit_client
from database import get_session
from repositories.comment_repository import CommentRepository
from repositories.post_repository import PostRepository
from services.ingress_service import IngressService
from utils.helpers import ensure_data_integrity
from utils.logger import logger


class RedditService:
    """
    Service for orchestrating Reddit data scraping and storage pipelines.

    Scraping is performed asynchronously; run_reddit_scraper() bridges into the
    async world via asyncio.run() and is the sole entry point for sync callers
    (e.g. IngressPipeline).
    """


    def __init__(self):
        self.scraper = IngressService()


    async def _run_scraper_async(self) -> Dict[str, Any]:
        """
        Internal async implementation of the Reddit scraping sequence.
        Closes the asyncpraw client in a finally block so the aiohttp session
        is always released after each pipeline run.

        Returns:
            Dict[str, Any]: Dictionary containing posts, submission_ids, and comments.
        """
        try:
            logger.info("Fetching agent-validated posts from database")
            posts = await self.scraper.fetch_validated_posts()

            if not posts:
                logger.warning("No posts were fetched. Exiting pipeline.")
                return {"posts": [], "submission_ids": [], "comments": []}

            submission_ids = self.scraper.fetch_post_ids()

            if not submission_ids:
                logger.warning(
                    "No submission IDs extracted. Exiting pipeline.")
                return {"posts": posts, "submission_ids": [], "comments": []}

            comments = await self.scraper.fetch_reddit_comments()

            if not comments:
                logger.warning("No comments were fetched. Exiting pipeline.")
                return {
                    "posts": posts,
                    "submission_ids": submission_ids,
                    "comments": []
                }

            logger.info("Reddit scraping complete")

            return {
                "posts": posts,
                "submission_ids": submission_ids,
                "comments": comments,
            }

        finally:
            await close_reddit_client()


    def run_reddit_scraper(self) -> Dict[str, Any]:
        """
        Run the Reddit scraping pipeline: fetch agent-validated posts,
        extract submission IDs, and fetch comments.

        This is the sync entry point used by IngressPipeline. It delegates all
        Reddit I/O to _run_scraper_async() via asyncio.run().

        Returns:
            Dict[str, Any]: Dictionary containing posts, submission_ids, and comments.
        """
        return asyncio.run(self._run_scraper_async())


    def run_reddit_storage(self, reddit_data: Dict):
        """
        Store Reddit posts and comments using the respective repositories.
        Args:
            reddit_data (Dict): Dictionary containing posts and comments to store.
        """
        logger.info("Starting Reddit storage")

        session = get_session()
        post_repo = PostRepository(session)
        comment_repo = CommentRepository(session)
        validated_ids = []

        try:
            logger.info("Storing posts")
            validated_ids = ensure_data_integrity(session, reddit_data)
            stored_posts = post_repo.store_posts(reddit_data, validated_ids)
            session.commit()
            logger.info(f"Stored {stored_posts} posts.")

        except Exception as error:
            session.rollback()
            session.close()
            logger.error(f"Error storing posts: {error}", exc_info = True)
            return

        try:
            logger.info("Storing comments")
            
            stored_comments = comment_repo.store_comments(
                reddit_data, submission_ids = validated_ids)
            session.commit()
            logger.info(f"Stored {stored_comments} comments.")

        except Exception as error:
            session.rollback()
            logger.error(f"Error storing comments: {error}", exc_info = True)

        finally:
            session.close()

        logger.info("Reddit storage complete")
