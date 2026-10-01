# PROJECT.md — Spry Monorepo Architecture & Contracts Specification

## 1. Overview & Repository Topology

Spry is organized as a single monorepo housing the backend API, frontend web application, database configuration, local orchestration, and continuous integration workflows.

```
spry/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Unified linting, type-checking, and CI pipeline
├── backend/
│   ├── alembic/
│   │   ├── versions/              # Database migration revision files
│   │   └── env.py                 # Alembic migration environment configuration
│   ├── app/
│   │   ├── api/                   # HTTP route declarations and controllers
│   │   ├── core/                  # Application configuration, settings, and DB session lifecycle
│   │   ├── models/                # SQLAlchemy declarative ORM persistence models
│   │   └── schemas/               # Pydantic validation and serialization schemas
│   ├── alembic.ini                # Alembic CLI runtime settings
│   ├── Dockerfile                 # Backend container build specification
│   ├── pyproject.toml             # Python dependencies and tool configs (Ruff, Mypy)
│   └── requirements.txt           # Pinned Python package dependencies
├── frontend/
│   ├── public/                    # Static assets served without processing
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/                # Base design-system primitives (shadcn/ui buttons, inputs, dialogs)
│   │   ├── features/
│   │   │   └── meetings/          # Meeting list view, creation form, and feature-specific components
│   │   ├── lib/                   # Utility helpers and API client fetch wrappers
│   │   ├── types/                 # Shared TypeScript interface definitions
│   │   ├── App.tsx                # Root layout and view composition
│   │   └── main.tsx               # DOM mount point and root React hydration
│   ├── Dockerfile                 # Frontend development container build specification
│   ├── index.html                 # Single-page application entry HTML template
│   ├── package.json               # Node.js project manifest and pinned dependencies
│   ├── tailwind.config.js         # Tailwind CSS styling and theme configuration
│   ├── tsconfig.json              # TypeScript compiler configuration
│   └── vite.config.ts             # Vite bundler, plugin, and development proxy configuration
├── docker-compose.yml             # Local multi-service composition specification
├── .gitignore                     # Monorepo-wide Git ignore rules
└── PROJECT.md                     # Structural specifications and contracts (this file)
```

### Directory Responsibilities

| Directory / File | Single Responsibility |
|---|---|
| `.github/workflows/` | Houses GitHub Actions workflow definitions executing automated checks on pull requests. |
| `backend/` | Root directory for the Python/FastAPI service, database ORM models, and migration scripts. |
| `backend/alembic/versions/` | Stores individual timestamped/versioned migration scripts defining database schema changes. |
| `backend/app/api/` | Houses API route declarations, HTTP request handlers, and endpoint routing. |
| `backend/app/core/` | Manages environment-driven application settings, logging, and database connection pooling. |
| `backend/app/models/` | Declares database table structures as SQLAlchemy ORM classes. |
| `backend/app/schemas/` | Defines Pydantic data schemas used for request validation, error reporting, and response serialization. |
| `frontend/` | Root directory for the React/Vite client application, styles, and web build configs. |
| `frontend/src/components/ui/` | Contains reusable UI presentation components derived from Tailwind CSS and shadcn/ui. |
| `frontend/src/features/meetings/` | Encapsulates the UI components, forms, and local state management for the meetings slice. |
| `frontend/src/lib/` | Provides shared utility functions, class-name mergers (`cn`), and HTTP client helpers. |
| `frontend/src/types/` | Houses TypeScript type definitions representing domain models and API contracts. |
| `docker-compose.yml` | Declaratively orchestrates `postgres`, `backend`, and `frontend` for local development. |

---

## 2. Service Definitions & Orchestration Contract (`docker-compose.yml`)

The developer contract mandates: **`docker compose up` is the only command a developer executes** after installing Docker Desktop to start all services in working order.

```mermaid
flowchart LR
    postgres["postgres (Port 5432)\nPostgreSQL 16-alpine"] -->|"Healthy (pg_isready)"| backend["backend (Port 8000)\nFastAPI / Python 3.12\nRuns Alembic Migrations"]
    backend -->|"Healthy (GET /api/health)"| frontend["frontend (Port 5173)\nReact + Vite Dev Server\nProxies /api -> backend:8000"]
```

### Service Specifications

| Attribute | `postgres` | `backend` | `frontend` |
|---|---|---|---|
| **Base Image / Runtime** | `postgres:16-alpine` | `python:3.12-slim` (via `backend/Dockerfile`) | `node:20-alpine` (via `frontend/Dockerfile`) |
| **Container Port** | `5432` | `8000` | `5173` |
| **Host Port Mapping** | `5432:5432` | `8000:8000` | `5173:5173` |
| **Required Env Vars** | `POSTGRES_USER=postgres`<br>`POSTGRES_PASSWORD=postgres`<br>`POSTGRES_DB=spry` | `DATABASE_URL=postgresql+psycopg://postgres:postgres@postgres:5432/spry`<br>`ENVIRONMENT=development`<br>`CORS_ORIGINS=http://localhost:5173` | `VITE_API_PROXY_TARGET=http://backend:8000` |
| **Dependencies** | None | `postgres` (`condition: service_healthy`) | `backend` (`condition: service_healthy`) |
| **Readiness Mechanism** | `pg_isready -U postgres -d spry` (interval: 3s, timeout: 3s, retries: 5) | `GET /api/health` returns `HTTP 200 {"status": "ok"}` (interval: 3s, timeout: 3s, retries: 5). Entrypoint executes `alembic upgrade head` prior to starting Uvicorn server. | Vite development server listens and responds on `http://localhost:5173`. Proxies all `/api/*` HTTP calls to `http://backend:8000`. |

---

## 3. Pinned Dependency Versions

All tools, runtimes, and core libraries are strictly pinned to avoid cross-environment inconsistency:

### Runtime & Infrastructure
* **Docker Compose:** v2.x
* **Python Runtime:** `3.12.x`
* **Node.js Runtime:** `20.x LTS` (Iron)
* **Database Engine:** `PostgreSQL 16.x` (`postgres:16-alpine`)

### Backend Toolchain
* `fastapi`: `0.115.0`
* `uvicorn[standard]`: `0.30.6`
* `sqlalchemy`: `2.0.35`
* `alembic`: `1.14.0`
* `pydantic`: `2.9.2`
* `pydantic-settings`: `2.5.2`
* `psycopg[binary]`: `3.2.3`

### Frontend Toolchain
* `react`: `18.3.1`
* `react-dom`: `18.3.1`
* `vite`: `5.4.8`
* `typescript`: `5.5.4`
* `tailwindcss`: `3.4.13`
* `lucide-react`: `0.446.0`
* `clsx`: `2.1.1`
* `tailwind-merge`: `2.5.2`

---

## 4. Scope & Contracts of the First Slice

The initial vertical slice demonstrates end-to-end data flow: listing meetings and creating a new meeting.

### 4.1 Data Model: `Meeting`

| Field | Data Type | Nullable | Constraints & Description |
|---|---|---|---|
| `id` | `Integer` | No | Primary Key, auto-incrementing unique identifier. |
| `title` | `String(255)` | No | Meeting title; minimum length: 1 character, maximum length: 255 characters. |
| `starts_at` | `DateTime(timezone=True)` | No | Timestamp stored in UTC with timezone offset (ISO 8601 string representation). |
| `ends_at` | `DateTime(timezone=True)` | No | Timestamp stored in UTC with timezone offset (ISO 8601 string representation). Constraint: `ends_at > starts_at`. |
| `attendee_count` | `Integer` | No | Non-negative integer representing confirmed attendees. Constraint: `>= 0`. |

---

### 4.2 Backend API Contracts

#### Health Check
* **Path:** `GET /api/health`
* **Response (HTTP 200 OK):**
  ```json
  {
    "status": "ok"
  }
  ```

#### List Meetings
* **Path:** `GET /api/meetings`
* **Query Parameters:** None
* **Response (HTTP 200 OK):**
  Ordered by `starts_at ASC`.
  ```json
  [
    {
      "id": 1,
      "title": "Weekly Team Sync",
      "starts_at": "2026-10-05T09:00:00Z",
      "ends_at": "2026-10-05T10:00:00Z",
      "attendee_count": 5
    }
  ]
  ```

#### Create Meeting
* **Path:** `POST /api/meetings`
* **Request Headers:** `Content-Type: application/json`
* **Request Body Schema:**
  ```json
  {
    "title": "Architecture Review",
    "starts_at": "2026-10-05T14:00:00Z",
    "ends_at": "2026-10-05T15:00:00Z",
    "attendee_count": 4
  }
  ```
* **Success Response (HTTP 201 Created):**
  Returns the complete persisted entity with generated `id`.
  ```json
  {
    "id": 2,
    "title": "Architecture Review",
    "starts_at": "2026-10-05T14:00:00Z",
    "ends_at": "2026-10-05T15:00:00Z",
    "attendee_count": 4
  }
  ```
* **Validation Error Response (HTTP 422 Unprocessable Entity):**
  Returned when payload fails validation (e.g., missing field, `attendee_count < 0`, or `ends_at <= starts_at`).
  ```json
  {
    "detail": [
      {
        "loc": ["body", "ends_at"],
        "msg": "ends_at must be strictly after starts_at",
        "type": "value_error"
      }
    ]
  }
  ```

---

### 4.3 Frontend Page Contract

The frontend presents a single view containing two interconnected sections:

1. **Meetings List Section:**
   * Fetches data via `GET /api/meetings` upon component mount.
   * Renders each meeting as a card or table row showing:
     * `title`
     * Date and time window formatted in user-local time (derived from `starts_at` and `ends_at`)
     * `attendee_count` with attendee badge or icon
   * Displays clear empty state message when the meetings array is empty.

2. **Add Meeting Form Section:**
   * Controlled form capturing:
     * `title` (text input, required)
     * `starts_at` (datetime-local picker, required)
     * `ends_at` (datetime-local picker, required)
     * `attendee_count` (number input, min=0, required)
   * Client-side validation enforcing non-empty title and `ends_at > starts_at`.
   * Submits JSON payload to `POST /api/meetings`.
   * Upon receiving `HTTP 201`: clears form fields, closes any modal or resets inputs, and appends the new meeting to the list (or triggers refetch).
   * Upon receiving `HTTP 422` or `500`: renders inline field or alert error messages without wiping entered data.

---

## 5. Strict Negative Constraints (Anti-Maximalism)

To preserve focus and delivery speed for the initial slice, the following components are **explicitly forbidden**:

1. **No Distributed Infrastructure or Brokers:** No Redis, Memcached, Celery, RabbitMQ, Kafka, or SQS mocks.
2. **No Extra Reverse Proxies:** No Nginx, Caddy, HAProxy, or Envoy container. Frontend Vite proxy handles dev routing; production ingress will be managed at the edge.
3. **No Cloud or Orchestration IaC in Tree:** No Kubernetes manifests, Helm charts, Terraform configurations, or AWS CDK scripts.
4. **No Authentication or Multi-Tenancy Logic:** No JWT tokens, session cookies, OAuth callbacks, or user account models in this slice.
5. **No Domain Model Inflation:** No meeting descriptions, agendas, notes, Google Event IDs, recurring schedules, or attendee email lists.
6. **No Additional CRUD Endpoints:** No `PUT`, `PATCH`, `DELETE`, search, filtering, sorting parameters, or pagination parameters in the initial slice.
