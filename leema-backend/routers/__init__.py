from routers.analysis_router import router as analysis_router
from routers.egress_router import router as egress_router
from routers.extraction_router import router as extraction_router
from routers.orchestration_router import router as orchestration_router
from routers.settings_router import router as settings_router

__all__ = [
    "settings_router",
    "extraction_router",
    "analysis_router",
    "egress_router",
    "orchestration_router",
]
