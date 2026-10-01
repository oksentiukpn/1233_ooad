# ADR 001: Architecture Repository Topology — Monorepo over Polyrepo

**Status:** Accepted  
**Date:** 2026-10-01  
**Context:** Spry — Meeting Analytics for Teams (UCU OOAD, Module 1: Software Development 3.0)  
**Authors:** Spry Core Engineering Team (Team of 4)  

---

## 1. Context and Problem Statement

Spry is an early-stage product (0-to-1) built by a team of 4 engineers with no dedicated operations engineer. The initial architecture comprises:
- A backend API (FastAPI, SQLAlchemy, Alembic)
- A frontend web client (React, Vite, Tailwind CSS, shadcn/ui)
- Relational database schema & migrations (PostgreSQL)
- Local orchestration & CI workflows (Docker Compose, GitHub Actions)

We must decide the source repository topology: whether to partition the system across multiple repositories (e.g., `spry-backend`, `spry-frontend`, `spry-infra`) or unify all components inside a single repository (`spry` monorepo).

---

## 2. Decision

We will build Spry as a **single monorepo**: backend, frontend, database migrations, Docker environment, and CI workflows will reside in one unified directory tree.

```
spry/
├── backend/            # FastAPI, SQLAlchemy models, Alembic migrations
├── frontend/           # React + Vite application, Tailwind, shadcn/ui
├── docker-compose.yml  # Local multi-container orchestration (DB, API, Web)
├── .github/            # Unified CI pipelines
└── PROJECT.md          # Canonical system map and contracts
```

---

## 3. Defense & Justification

### 3.1 Software Development 3.0: The Repository is the Context Window
In an agent-driven development workflow, **the repository tree represents the primary context window** of an LLM or autonomous coding agent.

- **Contract Hallucination in Polyrepos:** When an agent works in an isolated `frontend` repository, it cannot inspect the FastAPI Pydantic schema or database migration directly. It is forced to rely on out-of-date API specs, documentation, or hallucinated assumptions regarding endpoint payload shapes, query parameter naming (`starts_at` vs `startTime`), nullability, and error envelopes. Every repository boundary introduces an informational blind spot that manifests as an integration failure at runtime.
- **Single-Pass Reasoning in Monorepos:** In a monorepo, an agent (and a human engineer) can inspect the vertical slice end-to-end in a single retrieval step:
  $$\text{PostgreSQL DDL} \longrightarrow \text{SQLAlchemy Model} \longrightarrow \text{Pydantic Schema} \longrightarrow \text{FastAPI Route} \longrightarrow \text{TypeScript Type} \longrightarrow \text{React Component}$$
  This end-to-end visibility eliminates interface drift and enables automated verification across boundaries.

### 3.2 The Boundary Trade-Off: Context vs. Independence
Every architectural boundary carries a cost:
$$\text{Boundary} = \text{Isolation \& Autonomy} - \text{Shared Context \& Co-evolution Speed}$$

- In large enterprise organizations (e.g., hundreds of independent teams), repository boundaries enforce organizational firewalls, independent release schedules, and fine-grained access control.
- For a **team of 4 engineers building a product from scratch**, organizational decoupling is completely unnecessary. There are no conflicting department schedules, no need for access silos, and no separate team handoffs.
- Context and co-evolution speed are overwhelmingly more valuable than autonomous isolation. Introducing boundaries prematurely introduces coordination friction with zero operational return.

### 3.3 Atomic Changes and Zero Contract Drift
In a monorepo:
1. **Atomic Commits:** An API modification, its corresponding database migration, and the updated frontend consumer are committed, reviewed, and merged in a single Git commit.
2. **Synchronized Pull Requests:** Breaking changes are impossible to deploy half-way: CI validates both client and server against the same commit SHA.
3. **Bisectability & Rollback Safety:** `git bisect` works across the entire product stack. Reverting a commit rolls back the API contract, database expectations, and UI components simultaneously without multi-repo tag orchestration.

---

## 4. Rebuttal of Common Counterarguments

| Counterargument against Monorepo | Why it does not apply to Spry |
|---|---|
| **"CI build times will slow down"** | At our current scale (first vertical slices), a full lint/test run across backend and frontend takes under 2 minutes. When needed, path-based triggering (`paths: ['backend/**']`) provides selective CI execution without multi-repo overhead. |
| **"Repo size and Git clone bloat"** | The monorepo contains only source code, migrations, and declarative configs. No binary assets, datasets, or node_modules are tracked in Git. Shallow clones (`depth: 1`) in CI keep operations sub-second. |
| **"Coupled deployments"** | Monorepo does not imply monolithic deployment. Docker images for `backend` and `frontend` are built from separate Dockerfiles and can be deployed independently to AWS App Runner / Cloudflare Pages. Repository structure is decoupled from artifact deployment. |
| **"Merge conflicts and ownership friction"** | With 4 engineers collaborating on cohesive vertical slices, team communication is high-bandwidth. A shared repository surfaces conflicts immediately at rebase time rather than during late integration testing. |

---

## 5. Consequences

### Positive
- Unified end-to-end development loop via `docker compose up`.
- AI coding assistants operate with full ground-truth context across client, server, and schema.
- Single source of truth for issue tracking, branching, and release tagging.
- Shared TypeScript/Pydantic contract validation without private package registry overhead.

### Negative / Mitigations
- Requires discipline in directory boundaries to avoid cross-layer spaghetti imports (mitigated by strict directory conventions defined in `PROJECT.md`).
- Tooling configs (`tsconfig.json`, `ruff.toml`, `pyproject.toml`) live side-by-side (mitigated by subfolder isolation under `backend/` and `frontend/`).
