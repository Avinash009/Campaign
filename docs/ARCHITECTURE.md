# CampaignHub — Architecture

**Version:** 0.1.0 · **Updated:** 2026-11-11

## 1. High-level architecture

**Style: modular monolith.** One deployable Next.js application with logically separated modules. No microservices in MVP — they add operational cost without benefit at this scale. Module boundaries are enforced by convention so modules can be extracted later if needed.

```mermaid
flowchart LR
    subgraph Client
        B[Browser]
    end
    subgraph Next.js App [Cloud Run / local Node]
        P[proxy.ts<br/>auth gate + security headers]
        subgraph Routing
            M[(marketing) pages]
            D[(dashboard) pages]
            A[(admin) pages]
            C[/c/slug campaign pages/]
            R[REST route handlers /api/*]
        end
        subgraph Modules [src/modules]
            AUTH[auth]
            BUS[businesses]
            CAMP[campaigns]
            LEADS[leads]
            ANA[analytics]
            SUBS[subscriptions]
            NOTIF[notifications]
            AUD[audit]
            AI[ai interfaces]
            STOR[storage adapter]
            MAIL[email adapter]
        end
    end
    DB[(PostgreSQL<br/>via Prisma)]
    FS[(Local disk / GCS)]

    B --> P --> Routing
    Routing --> Modules
    Modules --> DB
    STOR --> FS
    MAIL -->|dev: logs only| N[console/log]
    AI -.->|Phase 7| LLM[LLM provider]
```

## 2. Layering rules

```
src/app/**            routes: pages, layouts, route handlers  (thin)
src/modules/**        services + repositories + zod schemas   (domain logic)
src/lib/**            cross-cutting: env, logger, errors, rate-limit
src/components/**     UI: ui/ (shadcn), marketing/, dashboard/, shared/
prisma/schema.prisma  database schema + migrations + seed
```

- **Pages / route handlers** → call `service` functions. No direct Prisma imports in `src/app`.
- **Services** (`service.ts`) → business logic, authorization (session role + `businessId` scoping), orchestration, audit logging, notifications.
- **Repositories** (`repository.ts`) → Prisma queries only. Always accept an explicit tenant scope from the service layer.
- **Zod schemas** (`schemas.ts`) → validate every input. Shared types derive from them (`z.infer`).

## 3. Module responsibilities

| Module | Responsibility | Key files |
|---|---|---|
| `auth` | credentials login, password hashing (scrypt), session claims, RBAC helpers | `password.ts`, `repository.ts`, `schemas.ts` |
| `businesses` | registration, onboarding, profile, member invites, membership checks | Phase 2 |
| `industries` | industry catalog (seeded; admin-managed) | Phase 2/6 |
| `campaigns` | campaign CRUD, slugs, publish/pause/archive, images, public landing read model | `schemas.ts`, `lifecycle.ts`, `service.ts` |
| `leads` | enquiry intake (public), dedupe, list/search/filter, status updates, assignment, notes, follow-ups, CSV | `schemas.ts`, `helpers.ts`, `repository.ts`, `service.ts` |
| `analytics` | event tracking (page views/unique visitors), conversion metrics, dashboards | Phase 5 |
| `notifications` | in-app notification records | Phase 2+ |
| `subscriptions` | plans, business subscription state (no payment execution in MVP) | Phase 6 |
| `audit` | append-only `AuditLog` writes for significant operations | Phase 1 (interface) |
| `storage` | file upload abstraction: local adapter (dev) / GCS adapter (prod) | `storage/index.ts` |
| `email` | email sending abstraction: console transport (dev), provider later | `email/index.ts` |
| `ai` | service interfaces only — no implementations until Phase 7 | `ai/index.ts` |

## 4. Multi-tenancy

- Single shared database; every business-owned table has `businessId` FK → `Business`.
- Tenant context is resolved **per request** from the Auth.js JWT (user id + membership) — never from a URL or client-supplied value.
- Repositories receive `businessId` as a parameter; services obtain it from `requireBusinessContext()` (auth module) which verifies an active membership.
- Platform-admin operations use dedicated admin services that deliberately omit the tenant filter; they are named `*Platform*` to make cross-tenant access grep-able and auditable.
- Future isolation upgrade path (if an enterprise tier demands it): row-level security or schema-per-tenant — the schema already scopes everything by `businessId` so either is additive.

## 5. Rendering strategy

- **Classic dynamic rendering** (no `cacheComponents`). Rationale: nearly every dashboard page renders per-user, per-tenant request-time data; the Cache Components model adds Suspense-boundary constraints around every uncached read for little benefit here. Marketing pages are static React Server Components (no data) — effectively prerendered.
- Next.js 16 conventions: `proxy.ts` (Node runtime) instead of `middleware.ts`; async `cookies()`/`headers()`; Turbopack for dev + build; ESLint CLI for linting.
- `proxy.ts` performs optimistic auth checks (JWT cookie decode, redirect unauthenticated users away from `/dashboard`, `/admin`). Secure checks happen in services (per Next.js guidance — proxy is not the only line of defense).
- Route handlers are REST (`/api/*`); mutations from forms use fetch + JSON responses; Server Actions are allowed where they reduce boilerplate, with the same Zod validation.

## 6. Authentication & authorization

- Auth.js v5, credentials provider (email + scrypt password), JWT strategy, 30-day sessions.
- JWT claims: `sub` (user id), `businessId` (active membership), `isPlatformAdmin`.
- Login page `/login` (Phase 2); registration `/register` (Phase 2) creates user + business + OWNER membership in one transaction.
- Route groups: `(marketing)` public, `(dashboard)` business app, `(admin)` platform admin, `/c/[slug]` public campaign pages.
- Authorization matrix lives in `docs/API.md`.

## 7. Integrations (adapter pattern)

All external systems sit behind interfaces so implementations can change without touching domain logic:

| Concern | Interface | Dev implementation | Production implementation |
|---|---|---|---|
| File storage | `StorageAdapter` | `LocalStorageAdapter` → `public/uploads` | GCS adapter (Phase 8) — driver selected by `STORAGE_DRIVER` env |
| Email | `EmailService` | `ConsoleEmailService` (structured log, `delivered: false`) | SMTP/provider (later phase) |
| AI | `AiContentService`, `AiAssistantService`, `AiLeadScoringService` | none — interfaces only | LLM provider (Phase 7) |

Adapters fail loudly (`throw ApiError.serviceUnavailable`) when selected but unconfigured. Nothing pretends to succeed.

## 8. Cross-cutting concerns

- **Configuration:** `src/lib/env.ts` — Zod-validated `process.env`, fails fast with a clear message. Secrets only in env files (`.env` untracked; `.env.example` documents them).
- **Errors:** `src/lib/errors.ts` — `ApiError` + `routeHandler()` wrapper producing `{ error: { code, message, details? } }` JSON envelopes; unknown errors sanitized to 500.
- **Logging:** `src/lib/logger.ts` — single-line JSON with level, timestamp, context; level via `LOG_LEVEL`.
- **Rate limiting:** `src/lib/rate-limit.ts` — DB-backed sliding window on `RateLimitLog` (works across instances; no Redis dependency in MVP). Used by public enquiry + auth endpoints.
- **Audit:** `AuditLog` table written by services on significant operations (login, publish, status change, member invite, admin actions).

## 9. Deployment topology (Phase 8)

- **Target:** Google Cloud Run (Docker image, Mumbai region `asia-south2`), Cloud SQL PostgreSQL (private IP + managed pooling), Cloud Storage for uploads, Secret Manager for secrets.
- **Why:** scale-to-zero cost profile fits early stage; managed Postgres gives backups/PITR; container portability keeps Vercel/VPS options open. Cold-start mitigation: `min-instances=1` once traffic is real. Prisma connection pool sized to Cloud SQL limits.
- **Dev:** local Node + local PostgreSQL 14 + local storage adapter + console email.
- `Dockerfile`, `docker-compose.yml` (for parity/local stack), and deployment docs arrive in Phase 8 per the implementation plan.

## 10. Scaling roadmap

1. MVP (now): single Cloud Run service + small Cloud SQL.
2. Growth: bigger SQL tier, daily roll-up table for `CampaignEvent` aggregates (Phase 5 design keeps raw events append-only for this), background cleanup of old `RateLimitLog` rows.
3. Later: job runner (cron) for digests/follow-up reminders; Redis for hot rate limits if needed; AI provider calls via queue.
