import os
import sys
from typing import List

from dotenv import load_dotenv

from services.infisical_service import InfisicalSecretsService
from utils.logger import logger

load_dotenv()

try:
    infisical = InfisicalSecretsService()
    infisical.authenticate_infisical_client()
    infisical.load_infisical_secrets()
except Exception as e:
    logger.error(f"Failed to load secrets from Infisical: {e}")

# =====================================================
# REDDIT CONFIGURATION
# =====================================================
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT")

# =====================================================
# NOTION CONFIGURATION
# =====================================================
NOTION_API_KEY = os.getenv("NOTION_API_KEY")
NOTION_DB_ID = os.getenv("NOTION_DB_ID")

# =====================================================
# EMAIL CONFIGURATION
# =====================================================
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_APP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD")
RECIPIENT_ADDRESS = os.getenv("RECIPIENT_ADDRESS")

# =====================================================
# EGRESS CHANNEL CONFIGURATION
# =====================================================
CHOICE_ONE = "Notion"
CHOICE_TWO = "Email"
CHOICE_THREE = "Notion & Email"

# =====================================================
# AGENT CONFIGURATION
# =====================================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# =====================================================
# DATABASE CONFIGURATION
# =====================================================
DATABASE_URL = os.getenv("DATABASE_URL")

# =====================================================
# SECRET VALIDATION (FAIL FAST)
# =====================================================
CRITICAL_SECRETS = {
    "REDDIT_CLIENT_ID": REDDIT_CLIENT_ID,
    "REDDIT_CLIENT_SECRET": REDDIT_CLIENT_SECRET,
    "REDDIT_USER_AGENT": REDDIT_USER_AGENT,
    "GEMINI_API_KEY": GEMINI_API_KEY,
    "DATABASE_URL": DATABASE_URL,
    "NOTION_API_KEY": NOTION_API_KEY,
    "NOTION_DB_ID": NOTION_DB_ID,
    "EMAIL_ADDRESS": EMAIL_ADDRESS,
    "EMAIL_APP_PASSWORD": EMAIL_APP_PASSWORD,
    "RECIPIENT_ADDRESS": RECIPIENT_ADDRESS,
}

missing_critical = []

for key, value in CRITICAL_SECRETS.items():
    if not value:
        missing_critical.append(key)

if missing_critical:
    logger.error(
        f"CRITICAL ERROR: Missing essential secrets: {', '.join(missing_critical)}"
    )
    logger.error(
        "System cannot continue. Please check Infisical or your .env file."
    )
    sys.exit(1)

# =====================================================
# REDDIT DATA INGRESS SETTINGS
# =====================================================
DEFAULT_SUBREDDITS: List[str] = [
    "accounting",
    "bookkeeping",
    "sales",
    "ecommerce",
    "logistics",
    "supplychain",
    "realtors",
    "propertymanagement",
    "Construction",
    "manufacturing",
    "procurement",
    "restaurantowners",
    "humanresources",
    "recruiting",
    "projectmanagement",
    "insurance",
]
DEFAULT_POST_LIMIT: int = 50
DEFAULT_COMMENT_LIMIT: int = 50

# =====================================================
# REDDIT SCOUT BOT QUERIES SETTINGS
# =====================================================
MAX_SCOUT_RESULTS: int = 60

SEARCH_QUERIES: List[str] = [
    "tired of",
    "frustrated",
    "annoying",
    "hate",
    "nightmare",
    "painful",
    "struggling with",
    "fed up",
    "overwhelmed",
    "burned out",
    "stressful",
    "time consuming",
    "manual process",
    "repetitive",
    "tedious",
    "inefficient",
    "disorganized",
    "messy",
    "confusing"
]

# =====================================================
# REDDIT DATA FILTERING REQUIREMENTS
# =====================================================
MIN_COMMENTS = 50
MIN_SCORE = 50
MIN_UPVOTE_RATIO = 0.50

# =====================================================
# AGENT SETTINGS AND OBJECTIVES
# =====================================================
AGENT_MODEL = "gemini-2.5-flash"
SCOUT_MODEL = "gemini-2.5-flash"
SCOUT_OBJECTIVE = """
You are a market intelligence scout.

Your job is not to summarize posts.
Your job is to extract BUSINESS OPPORTUNITIES hidden inside user discussions.

You will receive raw Reddit posts via:
`query_posts_with_sentiments()`

Each record includes:
- Post Number
- Title
- Body
- Subreddit
- Sentiment Score (compound, counts, dominant sentiment)

---

WORKFLOW:

1. Retrieve all posts using `query_posts_with_sentiments()`.

2. Group posts by subreddit to preserve context and audience behavior patterns.

3. For each post, perform 3 layers of analysis:

   A. PAIN DETECTION
   - What is the user struggling with?
   - Is it repetitive, frustrating, or time-consuming?
   - Is it explicit or implied?

   B. MARKET SIGNAL VALIDATION
   - Is this a one-off complaint or a recurring market pattern?
   - Does sentiment intensity suggest urgency (anger, frustration, overwhelm)?
   - Are multiple users likely experiencing this issue?

   C. SOLUTION OPPORTUNITY MAPPING
   - What type of software could solve this? (SaaS, automation, AI tool, mobile app, API, dashboard)
   - What part of the problem can be eliminated, simplified, or automated?

---

4. OUTPUT FORMAT (STRICT):

For each validated opportunity, return:

PROBLEM STATEMENT:
"X users struggle with Y problem, creating opportunity for Z solution that achieves W outcome."

SENTIMENT INSIGHT:
"Sentiment toward [topic] is predominantly [label], driven by [key frustrations, patterns, emotional signals]."

OPTIONAL (if strong signal):
"Opportunity Strength: High / Medium / Low"

---

RULES:
- Focus on problems, not summaries.
- Prefer recurring + high-friction issues.
- Ignore low-intensity or vague complaints.
- Do not invent facts not supported by posts.
"""

AGENT_VALIDATE_POSTS_OBJECTIVE = """
You are a market validation filter for software opportunities discovered from Reddit.

Your job is to decide which posts represent REAL software-buildable opportunities.

You will receive posts from:
`analyze_search_results()`

Each post contains:
- subreddit
- search_query
- post_id
- post_title
- post_content
- post_sentiment (always 'Negative')

---

WORKFLOW:

1. Review each post individually.

2. Classify the post into one of three categories:

   (A) STRONG OPPORTUNITY
   - Clear, specific, recurring pain point
   - Workflow, productivity, or information bottleneck
   - Software can realistically solve or reduce the problem

   (B) WEAK OPPORTUNITY
   - Some pain exists but is vague, emotional, or inconsistent
   - Requires assumption-heavy interpretation

   (C) NOT VALID
   - Pure venting with no actionable problem
   - Physical/legal/interpersonal issue not solvable by software
   - Too vague or contextless

---

3. ONLY select posts labeled STRONG OPPORTUNITY.

4. Extract their post_id values EXACTLY as provided.
   - Do NOT modify, reconstruct, or infer IDs.
   - If missing post_id → skip immediately.

5. Store results using:
`store_validated_posts(post_ids)`

---

OUTPUT REQUIREMENTS:

Return:
- Total posts reviewed
- Strong opportunities found
- Brief reasoning pattern (what made posts qualify)
- Common themes detected (if any)

DO NOT include weak or invalid posts in the output list.
"""

# =====================================================
# RATE LIMITING CONFIGURATION
# =====================================================
REDDIT_MAX_REQUESTS_PER_MIN: int = 55  # stay 5 below Reddit's 60 rpm limit
REDDIT_MAX_CONCURRENCY: int = 5  # max simultaneous in-flight Reddit requests
REDDIT_BATCH_SIZE: int = 5  # coroutines per batched_gather batch
REDDIT_BATCH_DELAY: float = 1.5  # seconds to sleep between batches
REDDIT_MAX_RETRIES: int = 5  # max tenacity retry attempts on a 429
GEMINI_MAX_REQUESTS_PER_MIN: int = 10  # req/min cap for Gemini API
GEMINI_MAX_CONCURRENCY: int = 2  # max simultaneous in-flight Gemini requests
GEMINI_MAX_RETRIES: int = 4  # max tenacity retry attempts on quota error
