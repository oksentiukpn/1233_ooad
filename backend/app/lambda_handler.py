import logging
import os
from typing import Any, Dict

from mangum import Mangum

from app.main import app

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Primary Mangum handler for API Gateway / Lambda Function URL requests
handler = Mangum(app, lifespan="off")


def run_migrations() -> Dict[str, Any]:
    """Execute database migrations with Alembic inside Lambda environment."""
    from alembic.config import Config

    from alembic import command
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

    alembic_cfg = Config(ini_path)
    alembic_cfg.set_main_option("script_location", script_loc)
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

    try:
        command.upgrade(alembic_cfg, "head")
        logger.info("Alembic migrations completed successfully.")
        return {"statusCode": 200, "status": "success", "task": "migrate"}
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        return {"statusCode": 500, "status": "error", "error": str(e)}


def lambda_handler(event: Dict[str, Any], context: Any) -> Any:
    """Entry point router for AWS Lambda supporting HTTP requests and tasks."""
    if event.get("task") == "migrate" or event.get("action") == "migrate":
        logger.info("Executing programmatic migration task...")
        return run_migrations()

    return handler(event, context)
