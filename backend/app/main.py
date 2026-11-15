"""FastAPI application entry point with lifespan initialization."""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.database.init_db import init_db

configure_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager initializing DB tables and baseline seeds."""
    logger.info("Initializing database and verifying schema...")
    try:
        init_db()
    except Exception as e:
        logger.warning("Database auto-init encountered notice: %s", e)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Evidence-aware digital media research platform with Multi-Agent analysis.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix=settings.api_v1_prefix)
