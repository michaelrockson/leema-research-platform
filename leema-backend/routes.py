from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from database.init_db import init_db
from routers import (
    settings_router,
    extraction_router,
    analysis_router,
    egress_router,
    orchestration_router,
)
from utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager that initializes the database schema and seeds
    default settings on application startup.
    """
    try:
        logger.info("Initializing database and seeding default settings...")
        init_db()
    except Exception as e:
        logger.error(f"Application startup initialization failed: {e}")
    yield


app = FastAPI(
    title = "Leema AI Agent Backend",
    description = "Three-Phase API powering customer problem discovery, sentiment analysis, and egress reporting.",
    version = "1.0.0",
    lifespan = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

api_router = APIRouter(prefix = "/api/v1")
api_router.include_router(settings_router)
api_router.include_router(extraction_router)
api_router.include_router(analysis_router)
api_router.include_router(egress_router)
api_router.include_router(orchestration_router)

app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run("routes:app", host = "127.0.0.1", port = 8000, reload = True)
