# Leema AI Agent Backend

Leema discovers and validates customer problems discussed on Reddit, analyzes
the conversations, and delivers curated opportunity briefs. This repository
contains the Python backend: a FastAPI API, a set of data-processing pipelines,
and a scheduled runner.

## What happens to the data

The full workflow runs these stages in order:

1. **Scout** searches configured Reddit communities for pain-point discussions
   and uses Gemini to identify software-solvable opportunities.
2. **Ingress** fetches approved Reddit posts and their discussions and stores
   them in the database.
3. **Sentiment** analyzes stored posts and comments and saves sentiment results.
4. **Curation** uses Gemini to turn the analyzed posts into opportunity briefs.
5. **Egress** delivers the latest brief to Notion, email, or both.

The API also exposes these stages as three phases: extraction (Scout and
Ingress), analysis (Sentiment and Curation), and egress (delivery).

## Requirements

- Python 3.11 or newer
- Reddit API credentials
- A Google Gemini API key
- A database supported by SQLAlchemy (SQLite is suitable for local development)
- Notion and email credentials: the current settings module requires these
  values at startup, even if you only plan to use one delivery channel
- Optional: an Infisical machine identity and project for loading secrets

## Get started

Clone the repository and move into the backend directory:

```shell
git clone https://github.com/michaelrockson/leema-ai-agent.git
cd leema-ai-agent/leema-backend
```

Create a virtual environment:

```shell
python -m venv .venv
```

Activate the virtual environment:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```shell
# macOS/Linux
source .venv/bin/activate
```

Install dependencies and create your local environment file:

```shell
python -m pip install -r requirements.txt
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```shell
# macOS/Linux
cp .env.example .env
```

`setup.sh` automates virtual-environment creation, copying `.env.example`, and
installing requirements. It is a Bash script; on Windows, run it from a Bash
environment such as Git Bash, or follow the manual steps above.

## Configuration

Fill in `.env` before starting the application. The current settings module
validates all of the following values as required:

| Variable | Purpose |
| --- | --- |
| `REDDIT_CLIENT_ID` | Reddit application client ID |
| `REDDIT_CLIENT_SECRET` | Reddit application client secret |
| `REDDIT_USER_AGENT` | User agent sent to Reddit |
| `GEMINI_API_KEY` | Google Gemini API key |
| `DATABASE_URL` | SQLAlchemy database connection URL |
| `NOTION_API_KEY` | Notion integration token |
| `NOTION_DB_ID` | Notion database ID |
| `EMAIL_ADDRESS` | Sender email address |
| `EMAIL_APP_PASSWORD` | Sender email app password |
| `RECIPIENT_ADDRESS` | Report recipient |

For local development with SQLite, a database URL can look like:

```env
DATABASE_URL=sqlite:///./leema.db
```

The database schema and default settings are initialized automatically when the
API starts and when extraction or the full one-shot pipeline runs.

### Optional Infisical integration

To load secrets from Infisical, set `INFISICAL_CLIENT_ID`,
`INFISICAL_CLIENT_SECRET`, and `INFISICAL_PROJECT_ID`. The service reads secrets
from the `dev` environment at the root (`/`) of the project. Without valid
Infisical credentials, the application uses the values in `.env`.

## Run the backend

### Start the API

From this directory, start the FastAPI application with Uvicorn:

```shell
python -m uvicorn server:app --reload
```

The API is available at `http://127.0.0.1:8000`. Interactive API
documentation is at `http://127.0.0.1:8000/docs` (ReDoc:
`http://127.0.0.1:8000/redoc`).

### Run the full workflow once

```shell
python run.py
```

This initializes the database and runs Scout, Ingress, Sentiment, Curation, and
Egress in sequence. The configured default egress choice sends to both Notion
and email.

### Run scheduled jobs

```shell
python scheduler.py
```

The blocking scheduler runs the scout job weekly, the full pipeline every two
weeks, and curated-data cleanup every two weeks (scheduled one day after
startup). It persists its APScheduler job store in `jobs.sqlite`.

## API overview

All API routes use the `/api/v1` prefix. The examples below show the current
request and response shapes. Start the API as described above before trying
them.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/runextraction` | Run extraction; optional comma-separated `subreddits` and `queries` query parameters |
| `POST` | `/api/v1/runextraction` | Run extraction with optional `subreddits` and `queries` arrays in the JSON body |
| `GET` | `/api/v1/runextraction/stream` | Stream extraction progress as server-sent events; accepts optional `subreddits` |
| `GET` | `/api/v1/extractions` | Retrieve extraction data |
| `GET` | `/api/v1/processdata` | Run sentiment analysis and curation |
| `GET` | `/api/v1/findings` | Retrieve existing curated findings |
| `GET` | `/api/v1/sendallchannels` | Deliver the latest brief to Notion and email |
| `GET` | `/api/v1/sendbyemail` | Deliver the latest brief by email |
| `GET` | `/api/v1/sendbynotion` | Deliver the latest brief to Notion |
| `GET` | `/api/v1/runallprocesses` | Run extraction, analysis, and egress sequentially |
| `GET` | `/api/v1/settings` | Read active settings (seeds defaults if none exist) |
| `GET` | `/api/v1/settings/{setting_id}` | Read a settings record by ID |
| `POST` | `/api/v1/settings` | Create a settings record |
| `PUT`, `PATCH` | `/api/v1/settings` or `/api/v1/settings/{setting_id}` | Update active settings or a record by ID |
| `DELETE` | `/api/v1/settings/{setting_id}` | Delete a settings record |
| `POST` | `/api/v1/settings/reset` | Reset active settings to defaults |

When extraction parameters are omitted, the API uses saved settings when
available, then falls back to the defaults in `settings/settings.py`.

### Extraction requests

The `GET /runextraction` endpoint accepts comma-separated query parameters:

```text
GET /api/v1/runextraction?subreddits=accounting,bookkeeping&queries=tired%20of,manual%20process
```

The `POST /runextraction` endpoint accepts arrays; both properties are
optional:

```json
{
  "subreddits": ["accounting", "bookkeeping"],
  "queries": ["tired of", "manual process"]
}
```

Both endpoints return the same shape:

```json
{
  "phase": "extraction",
  "success": true,
  "message": "Extraction Process Completed Successfully",
  "data": {
    "total_posts_extracted": 1,
    "recent_posts": [
      {
        "id": 1,
        "submission_id": "abc123",
        "subreddit": "accounting",
        "title": "Example post title",
        "score": 82,
        "number_of_comments": 57,
        "post_url": "https://www.reddit.com/r/accounting/comments/abc123/"
      }
    ]
  }
}
```

`GET /extractions` returns stored posts without running extraction. Its
`data` object contains `total_posts_extracted` and a `posts` array with the
same post fields as above. The extraction stream endpoint accepts an optional
comma-separated `subreddits` query parameter and returns
`text/event-stream`; each event is a JSON object prefixed by `data: `. Event
types include `status`, `warning`, `post_chunk`, `complete`, and `error`.

### Analysis, delivery, and orchestration responses

`GET /processdata` runs sentiment analysis and curation. `GET /findings`
returns existing findings without rerunning the analysis. Both return findings
in this shape:

```json
{
  "phase": "analysis",
  "success": true,
  "data": {
    "findings_count": 1,
    "findings": [
      {
        "id": 1,
        "title": "PROBLEM STATEMENT",
        "feasibility": "High",
        "description": "Example customer problem",
        "sentiment": "Example sentiment insight"
      }
    ]
  }
}
```

`GET /sendallchannels`, `/sendbyemail`, and `/sendbynotion` have no request
body. A successful delivery response looks like:

```json
{
  "phase": "egress",
  "success": true,
  "message": "Reports Sent Via Email.",
  "data": {
    "channel": "Email",
    "status": "DELIVERED"
  }
}
```

The `channel` and `message` values vary by endpoint. `GET /runallprocesses`
also takes no request body and returns each phase's `data` under
`data.extraction`, `data.analysis`, and `data.egress`.

### Settings requests and responses

Settings create and update requests accept any of these optional properties:

```json
{
  "communities": ["accounting", "bookkeeping"],
  "signals": ["tired of", "manual process"],
  "conversations_per_community": 50,
  "replies_per_conversation": 10
}
```

The count properties also accept the camelCase names
`conversationsPerCommunity` and `repliesPerConversation`. If omitted when
creating a record, values default to 50 conversations per community and 10
replies per conversation. `PUT` and `PATCH` accept the same body and update
only supplied fields. For example:

```shell
curl -X PATCH http://127.0.0.1:8000/api/v1/settings \
  -H "Content-Type: application/json" \
  -d "{\"communities\":[\"accounting\"],\"conversations_per_community\":25}"
```

Successful reads, creates, and updates return:

```json
{
  "success": true,
  "message": "Settings retrieved successfully",
  "data": {
    "id": 1,
    "communities": ["accounting", "bookkeeping"],
    "signals": ["tired of", "manual process"],
    "conversations_per_community": 50,
    "replies_per_conversation": 10,
    "conversationsPerCommunity": 50,
    "repliesPerConversation": 10,
    "created_at": "2026-01-01T00:00:00",
    "updated_at": "2026-01-01T00:00:00"
  }
}
```

The success message varies by operation. `DELETE /settings/{setting_id}`
returns `success` and `message` without a `data` property.
`POST /settings/reset` returns the same settings response shape, with the
active settings restored to defaults. A missing settings ID returns HTTP 404;
pipeline failures return HTTP 500 with a `detail` message.

## Code map

```text
server.py                  FastAPI app and startup initialization
run.py                     One-shot full pipeline entry point
scheduler.py               APScheduler job definitions and runner
routers/                    HTTP endpoints for settings and pipeline phases
pipelines/                  Scout, ingress, sentiment, curation, and egress stages
services/                   Reddit, Gemini, secrets, and business logic
clients/                    Reddit and Gemini API adapters
repositories/               Database queries and persistence
database/                   SQLAlchemy models, engine, and initialization
settings/settings.py        Environment loading and runtime configuration
utils/                      Shared helpers, logging, and rate limiting
utils/templates/            HTML email template
```

## Working in the codebase

- Pipeline classes expose a `run()` method and delegate domain work to services.
- Repositories encapsulate database access; SQLAlchemy models are in
  `database/models.py`.
- API routes are grouped in `routers/` and mounted under `/api/v1` by
  `server.py`.
- External Reddit and Gemini integrations are wrapped by `clients/`.
- Logs are emitted through the shared logger in `utils/logger.py`.

## Notes

- Reddit is the current source for community discussions.
- Gemini usage may incur API costs.
