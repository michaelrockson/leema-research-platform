from typing import List, Dict, Iterable, Optional

from sqlalchemy.orm import Session

from database.models import Comment


class CommentRepository:
    """
    Repository for handling Comment database operations.
    """


    def __init__(self, session: Session):
        self.session = session


    def create_comments(self, comments_data: List[Dict]) -> int:
        """
        Store multiple comments in the database.
        """
        count = 0
        for comment_data in comments_data:
            comment = Comment(
                submission_id = comment_data["submission_id"],
                title = comment_data.get("title", ""),
                subreddit = comment_data.get("subreddit", ""),
                author = comment_data.get("author", ""),
                body = comment_data.get("body", ""),
                score = comment_data.get("score", 0)
            )
            self.session.add(comment)
            count += 1
        return count


    def store_comments(self, reddit_data: dict,
                       submission_ids: Optional[Iterable[str]] = None) -> int:
        """
        Extract and persist comments from raw Reddit data.
        Args:
            reddit_data (dict): Raw Reddit data containing a 'comments' list.
            submission_ids (Iterable[str], optional): If given, only comments
                belonging to these submissions are stored. Used to avoid
                re-inserting comments for posts that already exist.
        Returns:
            int: Number of comments stored.
        """
        comments_to_store = reddit_data.get("comments", [])
        if submission_ids is not None:
            allowed = set(submission_ids)
            comments_to_store = [
                comment for comment in comments_to_store if comment["submission_id"] in allowed
            ]
        return self.create_comments(comments_to_store)
