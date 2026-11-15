# TrustMedia AI - Architecture

## System shape

Modular Monolith. One FastAPI application has domain modules; PostgreSQL stores data, pgvector supports embeddings, Redis supports cache/queue. A worker shares the codebase and can deploy separately when load justifies it. React Web and later Flutter share /api/v1.

## Scientific boundaries

1. Fact verification assesses a claim against retrieved evidence.
2. Media credibility assesses source attributes and article quality separately; domain/name alone is insufficient.
3. Public opinion describes sentiment, stance and emotion in collected comments, not the population.
4. Public trust is measured through survey responses and suitable sampling.
5. Information reception measures comprehension, acceptance and sharing intention with surveys or reading tasks.

Agents from one task cannot vote on another task. Confidence must be calibrated before it is reported as a probability; otherwise disclose the limit and support abstention.

## Backend modules and request paths

- api/v1: routes, validation and HTTP contract.
- core: environment settings and structured logs.
- database: SQLAlchemy engine/session; models and migrations follow in M1.
- schemas: Pydantic contracts independent of ORM.
- services: registry, retrieval and application logic.
- agents: task-specific agents with separate schemas.
- graph/workers: later orchestration and long-running jobs.

Health: GET /api/v1/health reports process liveness.
Readiness: GET /api/v1/ready runs SELECT 1 and Redis PING; returns 503 if either fails.
Catalog: GET /api/v1/datasets reads checked-in metadata, validates schemas, applies filters and pagination.
Web: React Query and Axios call the API; loading, empty, error and success states are distinct.

The initial catalog is metadata only; no dataset content is downloaded. M1 can migrate it to database-backed CRUD. The browser does not fabricate AI results.

## Data, provenance and security

All 16 seed records and license/schema states are UNVERIFIED. Before use, verify exact artifact, version, terms/license, schema/labels, language, download date, preprocessing and split. Future tables need UUIDs, UTC timestamps and explicit foreign keys/indexes. Survey identifiers should be separated from responses where possible.

Evidence must retain source URL, publisher, retrieval time, excerpt/hash, retrieval/model version and claim relation. Duplicate/dependent evidence must not count as independent votes.

URL fetching is not implemented. Before accepting URLs, validate scheme, DNS/public IP, every redirect, MIME, size and timeout to prevent SSRF. Treat article/comment/evidence as untrusted data, never system instructions. LLMs cannot invent citations. Keep secrets in environment and out of logs. Long analysis uses jobs returning 202 and an ID, plus rate limits and bounded retries.

## Consensus research

EWAC is a research hypothesis. Combine outputs only within the same task. Compare single-agent, majority, static weights, EWAC and EWAC with abstention on valid splits. Estimate quality, evidence weight, calibration and coefficients using validation data, not test data. Preserve UNRESOLVED where evidence is insufficient or disagreement remains.

## Current deployment

Compose provides PostgreSQL 18 with pgvector and Redis 8 for local development. API/web run on host; database ports bind to localhost. Authentication and public deployment are later milestones.
