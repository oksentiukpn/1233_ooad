#!/usr/bin/env bash
set -e

echo "Applying database migrations with Alembic..."
alembic upgrade head

echo "Starting Uvicorn server on port 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
