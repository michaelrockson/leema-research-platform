import asyncio
from typing import List, Dict, Tuple, Any

import markdown2
from jinja2 import Environment
from sqlalchemy.orm import Session

from database.models import Comment, Post
from utils.logger import logger
from utils.rate_limiter import reddit_limiter, reddit_retry


def combine_search_queries(queries: List[str], chunk_size: int = 8) -> List[
    str]:
    """
    Groups a list of individual search query phrases into combined boolean OR search queries.
    For example: ['tired of', 'frustrated', 'annoying'] -> ['("tired of" OR "frustrated" OR "annoying")']
    This drastically cuts Reddit search API calls by up to 85-90% without losing coverage.
    """
    if not queries:
        return []

    combined = []
    for chunk_start in range(0, len(queries), chunk_size):
        chunk = queries[chunk_start: chunk_start + chunk_size]
        formatted_terms = [
            f'"{query.strip()}"' if not (
                    query.strip().startswith('"') and query.strip().endswith(
                    '"')) else query.strip()
            for query in chunk
            if query.strip()
        ]
        if formatted_terms:
            combined.append(f"({' OR '.join(formatted_terms)})")
    return combined


def serialize_comment(comment: Comment) -> Dict:
    """
    Serializes a Comment object into a dictionary.
    Args:
        comment (Comment): The Comment object to serialize.
    Returns:
        Dict: A dictionary containing the serialized comment data.
    """
    return {
        "comment_id": comment.id,
        "post_key": comment.submission_id,
        "body": comment.body,
        "author": comment.author,
        "score": comment.score,
    }


def serialize_post(post: Post, comments: List[Dict]) -> Dict:
    """
    Serializes a Post object into a dictionary.
    Args:
        post (Post): The Post object to serialize.
        comments (List[Dict]): The list of comments associated with the post.
    Returns:
        Dict: A dictionary containing the serialized post data.
    """
    return {
        "post_number": post.id,
        "post_key": post.submission_id,
        "subreddit": post.subreddit,
        "title": post.title,
        "body": post.body,
        "comments": comments,
    }


def get_comments_for_post(session, post_id: str) -> Tuple[List[Dict], int]:
    """
    Retrieves comments for a specific post from the database.
    Args:
        session (Session): The database session.
        post_id (str): The ID of the post to retrieve comments for.
    Returns:
        Tuple[List[Dict], int]: A tuple containing a list of comment dictionaries and the count of comments.
    """
    comments = (
        session.query(Comment)
        .filter(Comment.submission_id == post_id)
        .all()
    )

    comment_records = []
    count = 0
    for comment in comments:
        comment_records.append(serialize_comment(comment))
        count += 1

    return comment_records, count


@reddit_retry
async def get_comments_from_submission(reddit, submission_id: str,
                                       comment_limit: int) -> List[
    Dict[str, Any]]:
    """
    Fetch and format comments from a single Reddit submission.

    Rate-limited via ``reddit_limiter`` (semaphore + token bucket) and
    automatically retried with exponential back-off on 429 errors.

    Args:
        reddit: The asyncpraw Reddit client instance.
        submission_id: The Reddit submission ID to fetch comments from.
        comment_limit: Max number of comments to retrieve.

    Returns:
        List[Dict[str, Any]]: List of comment data dictionaries.
    """
    comments_collected = []

    async with reddit_limiter:
        submission = await reddit.submission(id = submission_id)
        await submission.comments.replace_more(limit = 0)

        comments = submission.comments.list()
        if comment_limit:
            comments = comments[:comment_limit]

        for comment in comments:
            if not comment.body or comment.body in ("[deleted]", "[removed]"):
                continue

            comment_data: Dict[str, Any] = {
                "submission_id": submission.id,
                "title": submission.title,
                "subreddit": submission.subreddit.display_name,
                "author": str(comment.author) if comment.author else "Unknown",
                "body": comment.body,
                "score": comment.score
            }
            comments_collected.append(comment_data)

    return comments_collected


def get_posts_from_subreddit(
    reddit,
    subreddit_name: str,
    post_limit: int,
    min_upvote_ratio: float,
    min_score: int,
    min_comments: int
) -> List[Dict[str, Any]]:
    """
    Fetch and filter posts from a single subreddit.

    Args:
        reddit: The Reddit client instance.
        subreddit_name: The name of the subreddit to fetch posts from.
        post_limit: Max number of posts to retrieve.
        min_upvote_ratio: Minimum upvote ratio to include a post.
        min_score: Minimum score to include a post.
        min_comments: Minimum number of comments to include a post.

    Returns:
        List[Dict[str, Any]]: List of post data dictionaries.
    """
    posts = []

    subreddit_posts = list(
        reddit.subreddit(subreddit_name).hot(limit = post_limit))
    logger.info(
        f"Retrieved {len(subreddit_posts)} posts from r/{subreddit_name}.")

    for submission in subreddit_posts:
        if (
            submission.upvote_ratio >= min_upvote_ratio
            and submission.score >= min_score
            and submission.num_comments >= min_comments
            and not submission.stickied
        ):
            post_data: Dict[str, Any] = {
                "subreddit": subreddit_name,
                "submission_id": submission.id,
                "title": submission.title,
                "body": submission.selftext,
                "upvote_ratio": submission.upvote_ratio,
                "score": submission.score,
                "number_of_comments": submission.num_comments,
                "post_url": submission.url
            }
            posts.append(post_data)

    return posts


@reddit_retry
async def get_post_by_id(reddit, submission_id: str) -> Dict[str, Any]:
    """
    Fetch and format a single Reddit submission by its ID.

    Rate-limited via ``reddit_limiter`` (semaphore + token bucket) and
    automatically retried with exponential back-off on 429 errors.

    Args:
        reddit: The asyncpraw Reddit client instance.
        submission_id: The Reddit submission ID to fetch.

    Returns:
        Dict[str, Any]: Post data dictionary.
    """
    async with reddit_limiter:
        submission = await reddit.submission(id = submission_id)
        return {
            "subreddit": submission.subreddit.display_name,
            "submission_id": submission.id,
            "title": submission.title,
            "body": submission.selftext,
            "upvote_ratio": submission.upvote_ratio,
            "score": submission.score,
            "number_of_comments": submission.num_comments,
            "post_url": submission.url
        }


def evaluate_engagements(search_result, cumulated_search_results, subreddit,
                         search_query, min_upvote_ratio, min_score,
                         min_comments):
    if (
        search_result.upvote_ratio >= min_upvote_ratio
        and search_result.score >= min_score
        and search_result.num_comments >= min_comments
        and not search_result.stickied
    ):
        cumulated_search_results.append(
            {"subreddit": subreddit,
             "search_query": search_query,
             "post_id": search_result.id,
             "post_title": search_result.title,
             "post_content": search_result.selftext,
             "post_score": search_result.score})


def ensure_data_integrity(session: Session, reddit_data) -> list:
    """
    Ensures data integrity by checking if the submission_ids in the reddit_data exist in the database.
    Args:
        session (Session): The database session.
        reddit_data (dict): The Reddit data to check.
    Returns:
        list: A list of submission_ids that do NOT exist in the database.
    """
    posts_list = reddit_data.get("posts", [])
    submission_ids_from_posts = []

    for post in posts_list:
        submission_ids_from_posts.append(post["submission_id"])

    if len(submission_ids_from_posts) == 0:
        return []

    query_results = session.query(Post.submission_id).filter(
        Post.submission_id.in_(submission_ids_from_posts)).all()

    existing_submission_ids = set()
    for record in query_results:
        existing_submission_ids.add(record[0])

    new_submission_ids = []
    for submission_id in submission_ids_from_posts:
        if submission_id not in existing_submission_ids:
            new_submission_ids.append(submission_id)

    return new_submission_ids


def chunk_text(content: str, max_block_size: int = 2000) -> List[str]:
    """
    Split a string into chunks no larger than max_block_size characters.
    Args:
        content (str): The text to chunk.
        max_block_size (int): Maximum characters per block.
    Returns:
        List[str]: List of text chunks.
    """
    total_characters = len(content)
    logger.info(f"Total characters in the text: {total_characters}")

    blocks = []
    try:
        if total_characters > max_block_size:
            full_blocks = total_characters // max_block_size
            remainder = total_characters % max_block_size

            for block_number in range(full_blocks):
                start_index = block_number * max_block_size
                end_index = start_index + max_block_size
                blocks.append(content[start_index:end_index])

            if remainder > 0:
                blocks.append(content[-remainder:])
        else:
            blocks.append(content)

        logger.info(f"Total blocks created: {len(blocks)}")
        for block_index, block in enumerate(blocks):
            logger.debug(f"Block {block_index + 1} length: {len(block)}")

    except Exception as error:
        logger.error(f"Error while chunking text: {error}", exc_info = True)

    return blocks


def create_notion_blocks(text_blocks: List[str], safe_max: int = 1950) -> List[
    Dict]:
    """
    Convert a list of text chunks into Notion paragraph block dicts.
    Args:
        text_blocks (List[str]): Text chunks to convert.
        safe_max (int): Maximum characters per Notion rich_text entry.
    Returns:
        List[Dict]: List of Notion block dictionaries.
    """
    notion_blocks = []
    try:
        for block in text_blocks:
            start = 0
            while start < len(block):
                chunk = block[start:start + safe_max]
                notion_blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {"type": "text", "text": {"content": chunk}}]
                    }
                })
                start += safe_max

        logger.info(f"Created {len(notion_blocks)} Notion blocks.")

    except Exception as error:
        logger.error(f"Error creating Notion blocks: {error}", exc_info = True)

    return notion_blocks


def format_email(
    content: str,
    jinja_env: Environment,
    title: str,
    footer_text: str,
) -> str:
    """
    Render a brief's Markdown content as an HTML email via a Jinja2 template.
    Args:
        content (str): Markdown content to render.
        jinja_env (Environment): Configured Jinja2 environment.
        title (str): Email title / heading.
        footer_text (str): Footer string for the template.
    Returns:
        str: Rendered HTML string, or empty string on failure.
    """
    try:
        content_html = markdown2.markdown(content)
        template = jinja_env.get_template("card.html")
        rendered = template.render(
            title = title,
            content_html = content_html,
            footer_text = footer_text
        )
        return rendered

    except Exception as error:
        logger.error(f"Email formatting failed: {error}", exc_info = True)
        return ""


async def _deliver_all_async(service: Any) -> List[bool]:
    """
    Runs Notion page creation and email delivery concurrently.
    Both underlying methods are synchronous (SMTP and notion-client SDKs), so
    they are offloaded to threads via asyncio.to_thread to avoid blocking the
    event loop.

    Args:
        service: An EgressService instance.

    Returns:
        List[bool]: [notion_ok, email_ok]
    """
    logger.info("Delivering to all channels...")
    return await asyncio.gather(
        asyncio.to_thread(service.create_notion_page),
        asyncio.to_thread(service.send_email),
    )


def send_by_channel(service: Any, choice: str, notion_only: str,
                    email_only: str, all_channels: str) -> bool:
    """
    Dispatch a processed brief to the appropriate output channels.
    When all_channels is selected, Notion and email are sent concurrently.

    Args:
        service: An EgressService instance with create_notion_page() and send_email() methods.
        choice (str): The user's selected output channel.
        notion_only (str): Config value representing the Notion-only choice.
        email_only (str): Config value representing the email-only choice.
        all_channels (str): Config value representing the all-channels choice.

    Returns:
        bool: True only if every requested channel delivered successfully.
    """
    if choice == all_channels:
        notion_ok, email_ok = asyncio.run(_deliver_all_async(service))
        if not (notion_ok and email_ok):
            logger.error(
                f"Delivery incomplete: Notion={'ok' if notion_ok else 'failed'}, "
                f"Email={'ok' if email_ok else 'failed'}")
        return bool(notion_ok and email_ok)

    if choice == notion_only:
        logger.info("Publishing to Notion...")
        return bool(service.create_notion_page())

    if choice == email_only:
        logger.info("Sending email report...")
        return bool(service.send_email())

    logger.error(f"Unknown egress channel choice: {choice!r}")
    return False


def run_pipeline(pipeline, *args, **kwargs):
    """
    Runs a pipeline step and returns its success status.

    Args:
        pipeline: The pipeline instance to run.
        *args: Positional arguments for the pipeline's run method.
        **kwargs: Keyword arguments for the pipeline's run method.

    Returns:
        bool: True if the pipeline succeeded and found data, False otherwise.
    """
    pipeline_name = pipeline.__class__.__name__

    logger.info(f"Running {pipeline_name}...")

    if not pipeline.run(*args, **kwargs):
        logger.error(f"{pipeline_name} failed or found no data.")
        return False

    logger.info(f"{pipeline_name} execution successful.")
    return True


@reddit_retry
async def search_one(
    reddit,
    subreddit_name: str,
    query: str,
    min_upvote_ratio: float,
    min_score: int,
    min_comments: int,
) -> List[Dict]:
    """
    Searches a single subreddit for one query and returns posts that meet the
    configured engagement thresholds.

    Rate-limited via ``reddit_limiter`` (semaphore + token bucket) and
    automatically retried with exponential back-off on 429 errors.

    Intended to be scheduled as a coroutine inside ``batched_gather()`` so that
    multiple subreddit/query combinations run in controlled concurrent batches.

    Args:
        reddit: The asyncpraw Reddit client instance.
        subreddit_name (str): Name of the subreddit to search (without 'r/').
        query (str): Search query string passed to the Reddit search API.
        min_upvote_ratio (float): Minimum upvote ratio a post must have to be included.
        min_score (int): Minimum score (upvotes) a post must have to be included.
        min_comments (int): Minimum comment count a post must have to be included.

    Returns:
        List[Dict]: Posts that passed every engagement filter for this
        subreddit/query combination. Returns an empty list if no qualifying
        posts are found.
    """
    cumulated_search_results = []

    logger.info(
        f"Firing Reddit API call on r/{subreddit_name} with query='{query}'")

    async with reddit_limiter:
        subreddit = await reddit.subreddit(subreddit_name)

        async for search_result in subreddit.search(
            query,
            sort = "hot",
            limit = 120,
            time_filter = "month"
        ):
            evaluate_engagements(
                search_result,
                cumulated_search_results,
                subreddit_name,
                query,
                min_upvote_ratio,
                min_score,
                min_comments
            )

    if not cumulated_search_results:
        logger.warning(
            f"No qualifying results for query '{query}' on r/{subreddit_name}."
        )
    else:
        logger.info(
            f"Query '{query}' on r/{subreddit_name} found "
            f"{len(cumulated_search_results)} post(s)."
        )

    return cumulated_search_results
