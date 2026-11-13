# CampaignHub — Implementation Plan

**Started:** 2026-11-11 · Legend: ☐ pending · 🔶 in progress · ✅ done · ⏭ deferred by design

Phases follow the workflow agreed with the owner: one focus area per development session. Session 1 = Phase 1 (this session). Do not start a later phase before the current phase's checks pass (`npm run lint && npm run typecheck && npm run test && npm run build`).

## Phase 1 — Project foundation (Session 1)

| # | Task | Status |
|---|---|---|
| 1.1 | Inspect repo & environment (Node 22.9, PostgreSQL 14, no Docker) | ✅ |
| 1.2 | Scaffold Next.js 16 (TS, Tailwind v4, ESLint CLI, src dir, App Router) | ✅ |
| 1.3 | Install deps: Prisma, Auth.js v5, Zod, shadcn/ui, Lucide, Recharts, Vitest | ✅ |
| 1.4 | Write docs: AGENTS, PRD, ARCHITECTURE, DATABASE, API, UI_DESIGN, IMPLEMENTATION_PLAN, CHANGELOG, TESTING | ✅ |
| 1.5 | Design PostgreSQL schema (13 entities + enums) in `prisma/schema.prisma` | ✅ |
| 1.6 | Generate initial migration SQL offline (`prisma migrate diff`) → `0001_init` | ✅ |
| 1.7 | Env validation (`src/lib/env.ts`), `.env` + `.env.example` | ✅ |
| 1.8 | Cross-cutting libs: logger, API errors, rate limiter, slug utils | ✅ |
| 1.9 | Prisma client singleton | ✅ |
| 1.10 | Auth.js config: JWT sessions, credentials provider, type augmentation | ✅ |
| 1.11 | `proxy.ts` route protection (Next 16 convention) | ✅ |
| 1.12 | Password hashing (scrypt) + tests | ✅ |
| 1.13 | Storage adapter interface + local adapter; upload validation + tests | ✅ |
| 1.14 | Email service interface + console transport | ✅ |
| 1.15 | AI service interfaces (no implementations) | ✅ |
| 1.16 | Design tokens: indigo/slate theme in `globals.css` | ✅ |
| 1.17 | Marketing layout (header/footer) + public pages: Home, About, Features, Industries, Pricing, Contact | ✅ |
| 1.18 | Dashboard shell (sidebar/topbar) + dashboard home with real stat queries + empty states | ✅ |
| 1.19 | Admin layout + admin home (platform stats, empty states) | ✅ |
| 1.20 | Root error/not-found pages, Toaster | ✅ |
| 1.21 | Health endpoint `/api/health` | ✅ |
| 1.22 | Vitest setup + unit tests (password, slug, rate-limit, env, email transport) | ✅ |
| 1.23 | Seed script: industries, plans, admin, demo business/campaigns/leads/events | ✅ |
| 1.24 | README with setup instructions | ✅ |
| 1.25 | Apply migration + seed against live database (local PostgreSQL 14, `campaignhub`) | ✅ |
| 1.26 | End-to-end verification (health, DB-backed pages, owner/admin login, RBAC & anon redirects) | ✅ |

**Notes:** Login/register/onboarding endpoints are Phase 2 by design (Session 2); nav links exist. Home and pricing read live industry/plan data from the seeded database.

**Phase 1 verification (2026-11-11):** `npm run lint` clean · `npm run typecheck` clean · `npm run test` 48/48 passing (9 files) · `npm run build` succeeds (6 static, 6 dynamic routes, proxy registered) · live DB: `0001_init` applied, seed idempotent on re-run · `/api/health` → `{"status":"ok","database":"up"}` · owner login → `/dashboard` 200 with business name + lead stats · admin login → `/admin` 200 with platform totals · business user hitting `/admin` → 302 `/dashboard` · anonymous `/dashboard` & `/admin` → 307 `/login?callbackUrl=…`.

## Phase 2 — Business module (Session 2)

| # | Task | Status |
|---|---|---|
| 2.1 | Registration endpoint + form (owner account) | ✅ |
| 2.2 | Login page (Auth.js credentials flow) + logout | ✅ |
| 2.3 | Multi-step onboarding (business details → logo upload → complete) | ✅ |
| 2.4 | Business profile view/edit | ✅ |
| 2.5 | Team invitations (email + token, role) | ✅ |
| 2.6 | RBAC enforcement helpers + tests | ✅ |
| 2.7 | Notifications (lead created, member invited) | ✅ (team + onboarding; lead-created wiring lands with Phase 4) |
| 2.8 | Dashboard home: stat cards + recent lists with filters | ✅ |
| 2.9 | Session 1 leftover verification (login e2e against seeded users) | ✅ |

**Phase 2 verification (2026-11-11):** `npm run lint` clean · `npm run typecheck` clean · `npm run test` 72/72 passing (12 files) · `npm run build` succeeds (25 routes incl. `/onboarding`, `/invite/[token]`, 7 Phase 2 API routes) · live flow: register owner → sign in → onboarding creates business + OWNER membership + 14-day TRIALING starter subscription → dashboard 200 · invite teammate returns an invite link (console email transport reports `delivered: false`, UI says so) → second account accepts → MEMBER sees dashboard, gets 403 on invite/profile edit · seeded owner/admin logins still work.


## Phase 3 — Campaign module (Session 3)

| # | Task | Status |
|---|---|---|
| 3.1 | Campaign CRUD APIs + validation | ✅ |
| 3.2 | Campaign creation form (sections: basic/promo/targeting/CTA) | ✅ |
| 3.3 | Image upload (multi, validated) | ✅ |
| 3.4 | Campaign list page (filters, search, pagination) | ✅ |
| 3.5 | Campaign detail + edit | ✅ |
| 3.6 | Publish/pause/complete/archive lifecycle | ✅ |
| 3.7 | Industry landing templates (shared design system; real-estate, finance, insurance, education, healthcare, retail, travel variants) | ✅ |
| 3.8 | Public campaign URL `/c/[slug]` + owner preview (`/preview/campaigns/[id]`, outside the dashboard shell) | ✅ |

**Phase 3 verification (2026-11-12):** no Prisma migration needed (`Campaign`, `CampaignImage`, `CampaignEvent` already existed) · `npm run lint` clean · `npm run typecheck` clean · `npm run test` 103/103 passing (15 files) · `npm run build` succeeds (38 routes incl. `/c/[slug]`, `/preview/campaigns/[id]`, 6 campaign API routes) · live flow: Starter plan returns `409 campaign_limit_reached` → Growth creates a DRAFT (price stored as paise, interests parsed, dates at UTC midnight) → draft public page/API 404 → owner preview shows the draft banner → publish makes `/c/[slug]` public → rename keeps the slug → pause/completed take the page offline → archive makes the campaign read-only and cannot be reopened → incomplete publish returns `400 campaign_incomplete` with field details → image upload/remove works → unknown ids 404 (tenant-scoped) → MEMBER gets 403 on create/status/images and cannot open the new-campaign page, but can view the list. Verification rows and uploaded files were removed and the demo plan restored to Starter.

## Phase 4 — Lead module (Session 4)

| # | Task | Status |
|---|---|---|
| 4.1 | Public enquiry form (consent + privacy notice) + intake API (rate-limited, validated, deduped) | ✅ |
| 4.2 | Lead list page (search/filters/pagination) | ✅ |
| 4.3 | Lead detail: timeline, notes, follow-ups | ✅ |
| 4.4 | Status updates + assignment | ✅ |
| 4.5 | Quick actions (tel/mailto/wa.me links) | ✅ |
| 4.6 | CSV export | ✅ |

**Phase 4 verification (2026-11-13):** no Prisma migration needed (`Lead`, `LeadActivity` already existed) · `npm run lint` clean · `npm run typecheck` clean · `npm run test` 146/146 passing (17 files) · `npm run build` succeeds (48 routes, 11 new incl. `/dashboard/leads`, `/dashboard/leads/[id]`, 8 lead API routes and the public enquiry endpoint) · live flow: valid enquiry `201` (phone stored as `919876500001`, consent text + UTM captured, `CREATED` activity) → same phone within 24h `200 { duplicate: true }` with the original reference → filled honeypot `400 invalid_submission` (no row) → missing consent and malformed phone `400 validation_failed` → 6th request in the hour `429` with `Retry-After` → owner list/filters/search, CSV export (`text/csv`, BOM, `X-Lead-Count`), status `NEW→CONTACTED→CONVERTED→LOST→NEW` with correct outcome timestamps, notes, follow-up scheduled at 09:00 IST + marked complete, and assignment to the member → member sees only the 4 leads assigned to them, gets `404` for an unassigned lead and `403` on assignment, but can update their own lead → preview page renders the form disabled ("Preview only") → dashboard recent-lead links, campaign lead-count filter link and nav all resolve. Test leads, activities, notifications, audit rows and rate-limit rows were removed; the demo business is back to 6 leads on the Starter plan.

## Phase 5 — Analytics (Session 5)

| # | Task | Status |
|---|---|---|
| 5.1 | Page-view tracking (visitor cookie + beacon) | ✅ |
| 5.2 | Analytics services (views, unique visitors, conversion rate) | ✅ |
| 5.3 | Dashboard charts (Recharts): leads over time, campaign performance, conversion, comparison | ✅ |
| 5.4 | Date-range + campaign filters | ✅ |
| 5.5 | Leads-by-location table | ✅ |

**Phase 5 verification (2026-11-13):** no Prisma migration needed (`CampaignEvent` and `Lead.visitorId` already in the schema) · `npm run lint` clean · `npm run typecheck` clean · `npm run test` 176/176 passing (20 files) · `npm run build` succeeds (54 routes, 6 new: `/dashboard/analytics`, the four `/api/analytics/*` routes and the public events beacon) · live flow: beacon `202` creates one `PAGE_VIEW` with UTM source → a DRAFT campaign's page returns `404` and an invalid visitor id `400 validation_failed` → an enquiry carrying the `ch_visitor` cookie stores `visitorId` and writes the server-side `FORM_SUBMIT` event (a real browser visit set the cookie and beaconed; the owner preview created no event) → analytics page renders 30-day, 7-day and single-campaign views with charts, the campaign table and the location table; an unknown period falls back to 30 days → authenticated `/api/analytics/*` returns `200`; anonymous access is blocked · verification leads, events, notifications and audit rows were removed (demo business back to 87 page views, 6 form submits, 6 leads).

## Phase 6 — Platform administration

| # | Task | Status |
|---|---|---|
| 6.1 | Admin: businesses list/suspend | ☐ |
| 6.2 | Admin: industry management | ☐ |
| 6.3 | Admin: plan management | ☐ |
| 6.4 | Admin: campaign monitoring | ☐ |
| 6.5 | Admin: platform statistics | ☐ |

## Phase 7 — AI integration

| # | Task | Status |
|---|---|---|
| 7.1 | Choose provider; implement `AiContentService` (headlines/descriptions/CTA) | ☐ |
| 7.2 | Landing-page content generation | ☐ |
| 7.3 | Campaign assistant (audience/improvement suggestions) | ☐ |
| 7.4 | Lead qualification (transparent rule-based scoring first, LLM assist later) | ☐ |
| 7.5 | Follow-up assistant | ☐ |

## Phase 8 — Production readiness

| # | Task | Status |
|---|---|---|
| 8.1 | API integration tests (route handlers vs test DB) | ☐ |
| 8.2 | Playwright e2e (register → onboarding → campaign → lead) | ☐ |
| 8.3 | Dockerfile + docker-compose (app + postgres) | ☐ |
| 8.4 | Deployment docs (Cloud Run, Cloud SQL, GCS, Secret Manager) | ☐ |
| 8.5 | Security review + rate-limit/audit spot checks | ☐ |
| 8.6 | Performance pass (indexes, roll-ups if needed) | ☐ |

## Dependency notes

- Phase 1 is complete and verified against the local PostgreSQL 14 database.
- Phase 2 depends on Phase 1 auth plumbing; Phase 3 on industries + storage; Phase 4 on 3.7/3.8; Phase 5 on 4.1.
