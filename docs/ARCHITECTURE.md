# CampaignHub — Architecture

**Version:** 0.1.0 · **Updated:** 2026-11-15

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
            AI[ai services]
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
    AI -.->|content generation only| LLM[configured LLM endpoint]
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
| `analytics` | first-party event tracking (page views/unique visitors), conversion metrics, overview APIs and dashboards | `helpers.ts`, `schemas.ts`, `repository.ts`, `service.ts` |
| `admin` | platform-admin only: statistics, business suspension, industry/plan catalogs, cross-tenant campaign monitoring | `schemas.ts`, `repository.ts`, `service.ts`, `types.ts` |
| `notifications` | in-app notification records | Phase 2+ |
| `subscriptions` | plan reads, business subscription state (plan catalog is managed by `admin`; no payment execution in MVP) | Phase 2/P6 |
| `audit` | append-only `AuditLog` writes for significant operations | Phase 1 (interface) |
| `storage` | file upload abstraction: local adapter (dev) / GCS adapter (prod) | `storage/index.ts` |
| `email` | email sending abstraction: console transport (dev), provider later | `email/index.ts` |
| `ai` | content generation behind `AiContentService` (OpenAI-compatible adapter) plus deterministic rule-based campaign review, lead scoring and follow-up drafts | `schemas.ts`, `provider.ts`, `content-service.ts`, `lead-qualification.ts`, `follow-up.ts`, `campaign-assistant.ts`, `service.ts` |

## 4. Multi-tenancy

- Single shared database; every business-owned table has `businessId` FK → `Business`.
- Tenant context is resolved **per request** from the Auth.js JWT (user id + membership) — never from a URL or client-supplied value.
- Repositories receive `businessId` as a parameter; services obtain it from `requireBusinessContext()` (auth module) which verifies an active membership.
- `CampaignEvent` has no tenant column; analytics queries scope it through `campaign.businessId`. The public beacon resolves an ACTIVE campaign of an ACTIVE business before writing anything.
- Platform-admin operations use dedicated admin services that deliberately omit the tenant filter; they are named `*Platform*` to make cross-tenant access grep-able and auditable. The admin layout and every admin page call `requirePlatformAdmin()`; each `/api/admin/*` route calls `requireApiPlatformAdmin()`.
- Business suspension (`Business.status = SUSPENDED`) takes public campaign pages offline; tenant dashboard access during suspension is unchanged (out of Phase 6 scope).
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
| AI content | `AiContentService` | OpenAI-compatible chat-completions adapter when `AI_PROVIDER=openai` + `AI_API_KEY`; otherwise `503 ai_not_configured` | same adapter pointed at any compatible endpoint (`AI_BASE_URL`) |

Adapters fail loudly (`throw ApiError.serviceUnavailable`) when selected but unconfigured. Nothing pretends to succeed.

**AI boundaries.** Two kinds of feature live behind `src/modules/ai/`:

- **Provider-backed** (`AiContentService`): ad copy (7.1) and landing-page copy (7.2). One `fetch` to `<AI_BASE_URL>/chat/completions` with a JSON-only prompt; the response is parsed and validated with Zod. Failures map to specific `503` codes — `ai_not_configured`, `ai_provider_auth`, `ai_quota_exhausted`, `ai_provider_rate_limited`, `ai_provider_error`, `ai_invalid_response`, `ai_timeout`, `ai_unavailable` — with messages that never echo the key or raw provider payload. There is no template fallback — that would be simulated AI.
- **Rule-based** (`AiCampaignAssistantService`, `AiLeadScoringService`, `AiFollowUpService`): campaign review (7.3), lead qualification (7.4) and follow-up drafts (7.5). Deterministic functions over real campaign/lead data, clearly labelled "Rule-based" in the UI. They never call a provider and never forecast outcomes; follow-up drafts are copied or opened in the user's own app, never sent by CampaignHub.

## 8. Cross-cutting concerns

- **Configuration:** `src/lib/env.ts` — Zod-validated `process.env`, fails fast with a clear message. Secrets only in env files (`.env` untracked; `.env.example` documents them).
- **Errors:** `src/lib/errors.ts` — `ApiError` + `routeHandler()` wrapper producing `{ error: { code, message, details? } }` JSON envelopes; unknown errors sanitized to 500.
- **Logging:** `src/lib/logger.ts` — single-line JSON with level, timestamp, context; level via `LOG_LEVEL`.
- **Rate limiting:** `src/lib/rate-limit.ts` — DB-backed sliding window on `RateLimitLog` (works across instances; no Redis dependency in MVP). Used by public enquiry + auth endpoints and by AI content generation (20 requests/hour/business).
- **Audit:** `AuditLog` table written by services on significant operations (login, publish, status change, member invite, admin actions, AI content generation).

## 9. Deployment topology (Phase 8)

- **Target:** Google Cloud Run (Docker image, Mumbai region `asia-south2`), Cloud SQL PostgreSQL (private IP + managed pooling), Cloud Storage for uploads, Secret Manager for secrets.
- **Why:** scale-to-zero cost profile fits early stage; managed Postgres gives backups/PITR; container portability keeps Vercel/VPS options open. Cold-start mitigation: `min-instances=1` once traffic is real. Prisma connection pool sized to Cloud SQL limits.
- **Dev:** local Node + local PostgreSQL 14 + local storage adapter + console email.
- `Dockerfile`, `docker-compose.yml` (for parity/local stack), and deployment docs arrive in Phase 8 per the implementation plan.

## 10. Scaling roadmap

1. MVP (now): single Cloud Run service + small Cloud SQL.
2. Growth: bigger SQL tier, daily roll-up table for `CampaignEvent` aggregates (Phase 5 design keeps raw events append-only for this), background cleanup of old `RateLimitLog` rows.
3. Later: job runner (cron) for digests/follow-up reminders; Redis for hot rate limits if needed; AI provider calls via queue.
