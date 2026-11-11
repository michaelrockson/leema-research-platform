import smtplib
from email.message import EmailMessage
from pathlib import Path
from smtplib import SMTPAuthenticationError, SMTPConnectError
from typing import List, Dict

from jinja2 import Environment, FileSystemLoader, select_autoescape
from notion_client import APIErrorCode, APIResponseError, Client

from database import get_session
from repositories.brief_repository import BriefRepository
from services.runtime_settings_service import load_runtime_settings
from settings import settings
from utils.helpers import chunk_text, create_notion_blocks, \
    format_email
from utils.logger import logger

BASE_DIR = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = BASE_DIR / "utils" / "templates"


class EgressService:
    """
    Service class responsible for generating reports, creating Notion pages, formatting emails and sending emails.
    """


    def __init__(self):
        self.queried_brief = None
        self.formatted_email = None
        self.notion_key = settings.NOTION_API_KEY
        runtime_settings = load_runtime_settings()
        self.notion_parent_page = (
            runtime_settings.notion_database_id or settings.NOTION_DB_ID
        )
        self.email_address = settings.EMAIL_ADDRESS
        self.email_password = settings.EMAIL_APP_PASSWORD
        self.recipient_address = (
            runtime_settings.recipient_address or settings.RECIPIENT_ADDRESS
        )
        self.notion_client = Client(auth = self.notion_key)
        self.notion_blocks = []
        self.session = get_session()
        self.brief_repo = BriefRepository(self.session)
        self.title = "Reddit Problem & Sentiment Report"
        self.footer_text = "©2026 Rocksoncodes. All rights reserved."

        if not TEMPLATE_DIR.exists():
            raise RuntimeError(f"Template directory not found: {TEMPLATE_DIR}")

        self.jinja_env = Environment(
            loader = FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape = select_autoescape(["html"])
        )


    def query_brief(self):
        """
        Query the database for the most recent AI processed brief, so each
        report only delivers the newest findings rather than re-sending
        older briefs.
        Returns:
            dict or None: Queried brief data or None if not found or error occurs.
        """
        try:
            queried_brief = self.brief_repo.get_latest_brief(limit = 1)

            if not queried_brief:
                raise ValueError("No briefs found in the database.")

            query_collection: List[Dict] = []

            for result in queried_brief:
                query_result = {
                    "id": result.id,
                    "curated_content": result.curated_content
                }
                query_collection.append(query_result)

            logger.info(f"Retrieved {len(query_collection)} brief(s)")

            self.queried_brief = query_collection
            return query_collection

        except Exception as error:
            logger.error(
                f"Error querying briefs from the database: {error}",
                exc_info = True)
            return None


    def _collect_content(self, channel: str) -> str | None:
        """
        Load the latest brief (if not already loaded) and join its content.
        Returns None if there is nothing to deliver.
        """
        if not self.queried_brief:
            self.query_brief()
            if not self.queried_brief:
                logger.error(f"No brief available. Aborting {channel} delivery.")
                return None

        content = []
        for queried_content in self.queried_brief:
            if not queried_content or not queried_content.get(
                "curated_content"):
                logger.warning(f"No content available to format for {channel}.")
                return None
            content.append(queried_content.get("curated_content"))

        return "\n\n".join(content)


    def create_notion_page(self) -> bool:
        """
        Create a Notion page with the chunked and formatted content blocks.
        Returns:
            bool: True if the page was created, False otherwise.
        """
        if not self.notion_key or not self.notion_parent_page:
            logger.error(
                "Notion is not configured (NOTION_API_KEY / NOTION_DB_ID missing).")
            return False

        content = self._collect_content("Notion")
        if not content:
            return False

        text_blocks = chunk_text(content)

        if not text_blocks:
            logger.warning(
                "No Notion blocks to publish. Aborting page creation...")
            return False

        notion_blocks = create_notion_blocks(text_blocks)
        self.notion_blocks = notion_blocks

        if not notion_blocks:
            logger.warning(
                "No Notion blocks to publish. Aborting page creation...")
            return False

        try:
            children_blocks = [
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{"type": "text", "text": {
                            "content": "Discovered Problems"}}]
                    }
                },
                *notion_blocks
            ]

            response = self.notion_client.pages.create(
                parent = {"page_id": self.notion_parent_page},
                properties = {
                    "title": [
                        {"type": "text", "text": {"content": self.title}}
                    ]
                },
                children = children_blocks
            )

            if response.get("request_id"):
                logger.info("Notion page created")
            else:
                logger.warning(
                    "Notion page creation response received but request_id missing.")
            return True

        except APIResponseError as error:
            if error.code == APIErrorCode.ObjectNotFound:
                logger.error(
                    "The specified parent page was not found.",
                    exc_info = True)
            else:
                logger.error(f"Notion API error: {error}", exc_info = True)
        except Exception as error:
            logger.error(
                f"Unexpected error creating Notion page: {error}", exc_info = True)
        return False


    def send_email(self, subject = "Reddit Problem Report!") -> bool:
        """
        Format and send the brief as an HTML email to the configured recipient.
        Args:
            subject (str): Subject line for the email.
        Returns:
            bool: True if the email was sent, False otherwise.
        """
        if not (self.email_address and self.email_password
                and self.recipient_address):
            logger.error(
                "Email is not configured (EMAIL_ADDRESS / EMAIL_APP_PASSWORD / "
                "RECIPIENT_ADDRESS missing).")
            return False

        content = self._collect_content("email")
        if not content:
            return False

        self.formatted_email = format_email(
            content = content,
            jinja_env = self.jinja_env,
            title = self.title,
            footer_text = self.footer_text,
        )

        if not self.formatted_email:
            logger.warning("No data to email after formatting. Aborting send.")
            return False

        try:
            email_message = EmailMessage()
            email_message["From"] = self.email_address
            email_message["To"] = self.recipient_address
            email_message["Subject"] = subject
            email_message.set_content("This email contains an HTML report.")
            email_message.add_alternative(self.formatted_email, subtype = "html")

            logger.info(f"Sending email to {self.recipient_address}")

            with smtplib.SMTP("smtp.gmail.com", 587) as smtp_server:
                smtp_server.starttls()
                smtp_server.login(self.email_address, self.email_password)
                smtp_server.send_message(email_message)

            logger.info("Email successfully sent.")
            return True

        except SMTPAuthenticationError:
            logger.error("SMTP authentication failed.", exc_info = True)
        except SMTPConnectError:
            logger.error("SMTP connection failed.", exc_info = True)
        except Exception as error:
            logger.error(f"Email send failed: {error}", exc_info = True)
        return False
