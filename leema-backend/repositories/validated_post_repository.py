from typing import List, Optional

from sqlalchemy.orm import Session

from database import get_session
from database.models import ValidatedPost


class ValidatedPostRepository:
    """
    Repository for handling ValidatedPost database operations.

    Records in this table are submission IDs the agent has confirmed
    to be software-solvable problems and are staged for downstream
    pipeline processing.
    """


    def __init__(self, session: Optional[Session] = None):
        self.session = session if session is not None else get_session()


    def save(self, submission_id: str) -> ValidatedPost:
        """
        Insert a single validated submission ID.
        """
        record = ValidatedPost(submission_id = submission_id)
        self.session.add(record)
        return record


    def get_all(self) -> list[type[ValidatedPost]]:
        """
        Retrieve all validated post records.
        """
        return self.session.query(ValidatedPost).all()


    def get_unprocessed(self) -> list[type[ValidatedPost]]:
        """
        Retrieve validated posts that have not yet been processed by downstream stages.
        """
        return (
            self.session.query(ValidatedPost)
            .filter(ValidatedPost.is_processed == False)
            .all()
        )


    def get_existing_ids(self, submission_ids: List[str]) -> set:
        """
        Return the subset of submission_ids that already exist in the table.
        Useful for deduplication before bulk inserts.
        """
        rows = (
            self.session.query(ValidatedPost.submission_id)
            .filter(ValidatedPost.submission_id.in_(submission_ids))
            .all()
        )

        existing_ids = set()

        for row in rows:
            existing_ids.add(row.submission_id)

        return existing_ids


    def mark_as_processed(self, submission_ids: List[str]) -> int:
        """
        Mark a batch of validated posts as processed.

        Args:
            submission_ids: List of submission IDs to mark.

        Returns:
            int: Number of rows updated.
        """
        updated = (
            self.session.query(ValidatedPost)
            .filter(ValidatedPost.submission_id.in_(submission_ids))
            .update({"is_processed": True}, synchronize_session = False)
        )
        return updated


    def delete(self, submission_ids: List[str]) -> int:
        """
        Delete validated post records by submission ID.

        Returns:
            int: Number of rows deleted.
        """
        deleted = (
            self.session.query(ValidatedPost)
            .filter(ValidatedPost.submission_id.in_(submission_ids))
            .delete(synchronize_session = False)
        )
        return deleted
