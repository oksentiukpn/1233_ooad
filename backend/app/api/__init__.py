from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.meetings import router as meetings_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router, tags=["health"])
api_router.include_router(meetings_router, tags=["meetings"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])

__all__ = ["api_router"]
