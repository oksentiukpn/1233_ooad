from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings

app = FastAPI(
    title="Spry API",
    description="Meeting Analytics for Teams - Backend API",
    version="0.1.0",
)

if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router)


@app.get("/", tags=["root"])
def root() -> dict[str, str]:
    return {"message": "Spry API is running. Check /api/health and /docs for details."}
