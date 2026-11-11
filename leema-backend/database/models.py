from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, \
    Boolean, JSON, DateTime
from sqlalchemy.orm import relationship

from database import Base
from settings.setting_defaults import EDITABLE_SETTING_FIELDS, SETTING_DEFAULTS


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key = True, autoincrement = True)
    submission_id = Column(String(20), unique = True, nullable = False)
    subreddit = Column(String(100), nullable = False)
    title = Column(Text, nullable = False)
    body = Column(Text)
    upvote_ratio = Column(Float)
    score = Column(Integer)
    number_of_comments = Column(Integer)
    post_url = Column(Text)
    is_curated = Column(Boolean, default = False)

    comments = relationship(
        "Comment", back_populates = "post", cascade = "all, delete-orphan")
    sentiments = relationship(
        "Sentiment", back_populates = "post", cascade = "all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key = True, autoincrement = True)
    submission_id = Column(String(20), ForeignKey(
        "posts.submission_id", ondelete = "CASCADE"), nullable = False)
    subreddit = Column(String(100), nullable = False)
    title = Column(Text, nullable = False)
    author = Column(String(255))
    body = Column(Text)
    score = Column(Integer)

    post = relationship("Post", back_populates = "comments")


class Sentiment(Base):
    __tablename__ = "sentiments"

    id = Column(Integer, primary_key = True, autoincrement = True)
    post_id = Column(String(20), ForeignKey(
        "posts.submission_id", ondelete = "CASCADE"), nullable = False)
    sentiment_results = Column(JSON, nullable = False)
    is_curated = Column(Boolean, default = False)

    post = relationship("Post", back_populates = "sentiments")


class ProcessedBriefs(Base):
    __tablename__ = "processed_briefs"

    id = Column(Integer, primary_key = True, autoincrement = True)
    curated_content = Column(Text, nullable = False)


class CuratedItem(Base):
    __tablename__ = "curated_items"

    id = Column(Integer, primary_key = True, autoincrement = True)
    submission_id = Column(String(20), nullable = False, unique = True)
    scheduled_deletion = Column(Boolean, default = False)


class ValidatedPost(Base):
    __tablename__ = "validated_posts"

    id = Column(Integer, primary_key = True, autoincrement = True)
    submission_id = Column(String(100), nullable = False, unique = True)
    validated_at = Column(
        DateTime(timezone = True),
        default = lambda: datetime.now(timezone.utc),
        nullable = False
    )
    is_processed = Column(Boolean, default = False, nullable = False)


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key = True, autoincrement = True)
    communities = Column(JSON, nullable = False)
    signals = Column(JSON, nullable = False)
    conversations_per_community = Column(Integer, default = 50,
                                         nullable = False)
    replies_per_conversation = Column(Integer, default = 10, nullable = False)
    max_scout_results = Column(Integer, nullable = True)
    min_comments = Column(Integer, nullable = True)
    min_score = Column(Integer, nullable = True)
    min_upvote_ratio = Column(Float, nullable = True)
    recipient_address = Column(String(320), nullable = True)
    notion_database_id = Column(String(64), nullable = True)
    agent_model = Column(String(100), nullable = True)
    scout_model = Column(String(100), nullable = True)
    reddit_max_requests_per_min = Column(Integer, nullable = True)
    reddit_max_concurrency = Column(Integer, nullable = True)
    reddit_batch_size = Column(Integer, nullable = True)
    reddit_batch_delay = Column(Float, nullable = True)
    reddit_max_retries = Column(Integer, nullable = True)
    gemini_max_requests_per_min = Column(Integer, nullable = True)
    gemini_max_concurrency = Column(Integer, nullable = True)
    gemini_max_retries = Column(Integer, nullable = True)
    created_at = Column(
        DateTime(timezone = True),
        default = lambda: datetime.now(timezone.utc),
        nullable = False
    )
    updated_at = Column(
        DateTime(timezone = True),
        default = lambda: datetime.now(timezone.utc),
        onupdate = lambda: datetime.now(timezone.utc),
        nullable = False
    )


    def to_settings_values(self):
        """
        Every editable setting, with settings.py defaults filling any value
        that has not been saved yet.
        """
        values = {}
        for field_name in EDITABLE_SETTING_FIELDS:
            stored_value = getattr(self, field_name)
            values[field_name] = (
                SETTING_DEFAULTS[field_name]
                if stored_value is None
                else stored_value
            )
        return values


    def to_dict(self):
        return {
            "id": self.id,
            **self.to_settings_values(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
