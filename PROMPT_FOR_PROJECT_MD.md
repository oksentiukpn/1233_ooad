# Prompt for Generating PROJECT.md

Copy and paste the prompt below into your LLM or agent to generate `PROJECT.md`:

```markdown
Write PROJECT.md for a monorepo called "spry". It must describe the architectural structure of the repository only: directory layout, responsibilities of each directory, service definitions, pinned toolchain versions, and interface contracts between components.

DO NOT generate implementation code (no Python route functions, no SQLAlchemy ORM class definitions, no React JSX components, no CSS styles, and no raw SQL migrations). Describe structural specifications, data contracts, and folder responsibilities only.

### 1. Repository Layout & Directory Responsibilities
Define the exact directory tree for the repository. For every folder, provide a 1–2 sentence description explaining its single responsibility:
- `backend/`: FastAPI application, SQLAlchemy 2.0 ORM models, Alembic migrations, configuration, and dependencies.
  - Specify the internal folder structure (`app/api`, `app/models`, `app/schemas`, `app/core`, `alembic/versions`).
- `frontend/`: Single-page application built with React, Vite, Tailwind CSS, and shadcn/ui components.
  - Specify the internal folder structure (`src/components/ui`, `src/features/meetings`, `src/types`, `src/lib`).
- `docker-compose.yml` (at repo root): Orchestrates the local environment with three services: `postgres`, `backend`, and `frontend`.
- `.github/workflows/`: Unified CI checking formatting, linting, and types across both backend and frontend.

### 2. Service Definitions & Orchestration Contract (docker-compose.yml)
For each of the three services, document in a structured table or specification block:
1. Container name and pinned image/base runtime.
2. Exposed host port vs. internal container port.
3. Environment variables required for local bootstrap.
4. Upstream dependencies (`depends_on`).
5. Precise readiness probe / healthcheck mechanism (how the dependent service knows it is healthy before starting):
   - `postgres`: uses `pg_isready -U postgres` healthcheck.
   - `backend`: waits for `postgres` to be healthy, runs migrations (`alembic upgrade head`), and exposes a lightweight `GET /api/health` endpoint.
   - `frontend`: waits for `backend` to be healthy, exposes dev server on port 5173 with Vite proxy configured to route `/api/*` to `backend:8000`.
- Developer contract: `docker compose up` must be the only command required to spin up the entire working environment from a clean clone.

### 3. Pinned Dependency Versions
Pin the exact versions for the stack to eliminate environmental drift:
- Runtime & Language: Python 3.12, Node.js 20 LTS.
- Backend: FastAPI 0.115.x, SQLAlchemy 2.0.x, Alembic 1.14.x, Pydantic 2.x, Uvicorn 0.30.x.
- Frontend: React 18.3.x, Vite 5.4.x, TypeScript 5.5.x, Tailwind CSS 3.4.x, Lucide React, shadcn/ui components.
- Database: PostgreSQL 16-alpine.
- Orchestration: Docker Compose v2.

### 4. Scope & Contracts of the First Slice
Specify the contracts for the minimal first slice:
- **Entity Schema (`Meeting`)**:
  - `id`: integer (auto-incrementing primary key) or UUID string.
  - `title`: string (1–255 characters, required).
  - `starts_at`: ISO 8601 UTC timestamp (`YYYY-MM-DDTHH:MM:SSZ`, required).
  - `ends_at`: ISO 8601 UTC timestamp (`YYYY-MM-DDTHH:MM:SSZ`, required, must be after `starts_at`).
  - `attendee_count`: non-negative integer (`>= 0`, required).
- **Backend API Endpoints Contract**:
  - `GET /api/meetings`: Returns HTTP 200 with a JSON array of `Meeting` objects, ordered by `starts_at ASC`.
  - `POST /api/meetings`: Accepts JSON payload `{ title, starts_at, ends_at, attendee_count }`. Returns HTTP 201 with the created `Meeting` object including generated `id`. Returns HTTP 422 with validation errors for invalid types, missing fields, or if `ends_at <= starts_at`.
- **Frontend Page Contract**:
  - Single view containing:
    1. A meetings list displaying all fetched meetings (`title`, formatted start/end time, attendee count).
    2. An "Add Meeting" form with validation matching the backend schema, submitting to `POST /api/meetings` and refetching or appending to the list on success.

### 5. Strict Negative Constraints (Anti-Maximalism)
To prevent accidental over-engineering, explicitly state what is strictly forbidden:
- DO NOT include Redis, Celery, RabbitMQ, Kafka, or any background worker service.
- DO NOT include Nginx, Caddy, Traefik, or any reverse-proxy container.
- DO NOT include Kubernetes manifests, Helm charts, or cloud infrastructure IaC files.
- DO NOT include user accounts, authentication (OAuth/JWT), or tenancy logic in this slice.
- DO NOT add extra meeting fields (no description, location, Google event IDs, or recurring rules).
- DO NOT add extra endpoints (no PUT, PATCH, DELETE, pagination, or filtering).
```
