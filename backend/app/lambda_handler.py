import logging
import os
from typing import Any, Dict

from mangum import Mangum

from app.main import app

logger = logging.getLogger(__name__)

# Mangum translates AWS Lambda Function URL / API Gateway events into ASGI requests
asgi_handler = Mangum(app, lifespan="off")


def run_migrations() -> Dict[str, Any]:
    """Execute database migrations with Alembic inside Lambda environment."""
    from alembic import command
    from alembic.config import Config
    from app.core.config import settings

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(base_dir, "alembic.ini")
    script_loc = os.path.join(base_dir, "alembic")

    if not os.path.exists(ini_path):
        ini_path = "alembic.ini"
        script_loc = "alembic"

    logger.info(
        f"Running Alembic migrations with config: {ini_path}, scripts: {script_loc}"
    )
    cfg = Config(ini_path)
    cfg.set_main_option("script_location", script_loc)
    if settings.DATABASE_URL:
        cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

    try:
        command.upgrade(cfg, "head")
        logger.info("Database migrations completed successfully.")
        return {"status": "success", "message": "Alembic migrations applied to head"}
    except Exception as exc:
        logger.error(f"Failed to apply Alembic migrations: {exc}", exc_info=True)
        return {"status": "error", "message": str(exc)}


def handler(event: Dict[str, Any], context: Any) -> Any:
    """Main AWS Lambda entrypoint.

    Handles either:
    1. Direct invocation with {'action': 'migrate'} to run database migrations.
    2. HTTP requests via Mangum ASGI adapter for FastAPI endpoints.
    """
    if isinstance(event, dict) and event.get("action") == "migrate":
        return run_migrations()

    return asgi_handler(event, context)
