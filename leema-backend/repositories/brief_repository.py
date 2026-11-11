from sqlalchemy.orm import Session

from database.models import ProcessedBriefs


class BriefRepository:
    """
    Repository for handling ProcessedBriefs database operations.
    """


    def __init__(self, session: Session):
        self.session = session


    def create_brief(self, content: str) -> ProcessedBriefs:
        """
        Store a new AI-generated brief.
        """
        brief = ProcessedBriefs(curated_content = content)
        self.session.add(brief)
        return brief


    def get_latest_brief(self, limit: int = 10) -> list[ProcessedBriefs]:
        """
        Retrieve the most recent processed briefs, newest first.
        """
        return self.session.query(ProcessedBriefs).order_by(
            ProcessedBriefs.id.desc()).limit(limit).all()


    def get_brief_by_id(self, brief_id: int) -> ProcessedBriefs | None:
        return self.session.query(ProcessedBriefs).filter(
            ProcessedBriefs.id == brief_id).first()


    def update_brief_content(self, brief: ProcessedBriefs,
                             content: str) -> None:
        brief.curated_content = content


    def delete_brief(self, brief: ProcessedBriefs) -> None:
        self.session.delete(brief)
