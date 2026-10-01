from app.api.health import router as health_router
from app.api.meetings import router as meetings_router
from fastapi import APIRouter

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router, tags=["health"])
api_router.include_router(meetings_router, tags=["meetings"])

__all__ = ["api_router"]
