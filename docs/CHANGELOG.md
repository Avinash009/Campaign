# Changelog

All notable changes to CampaignHub are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versioning is
[SemVer](https://semver.org/).

## [0.3.0] — 2026-11-12 (Session 3: Campaign module)

### Added

- Campaign module (`src/modules/campaigns/`): Zod schemas (rupees → integer
  paise, comma-separated interests, `YYYY-MM-DD` dates, age bounds), tenant-scoped
  repository, lifecycle rules, and a service covering create/update, plan
  limits, publish validation, images and the public read model.
- Campaign APIs: `GET/POST /api/campaigns`, `GET/PATCH /api/campaigns/:id`,
  `POST /api/campaigns/:id/status`, `POST /api/campaigns/:id/images`,
  `DELETE /api/campaigns/:id/images/:imageId` and the rate-limited public
  `GET /api/public/campaigns/:slug`.
- Dashboard: campaign list (`/dashboard/campaigns`) with search, status filter
  and pagination; four-section create/edit form; detail page with publish
  checklist, lifecycle actions, public link and image manager (up to 8 images).
- Public landing pages at `/c/[slug]` with seven industry variants
  (real-estate, finance/loans, insurance, education/coaching, healthcare,
  retail/e-commerce, travel/tourism) plus a default, all built on one shared
  template. Owner preview lives at `/preview/campaigns/[id]` outside the
  dashboard shell with a status banner.
- Campaigns enabled in the dashboard navigation; dashboard home links owners and
  admins to “Create your first campaign” when the recent list is empty.
- Unit tests for campaign schemas, list-query parsing, lifecycle transitions and
  publish blockers (31 new tests).

### Decisions

- No schema migration: `Campaign`, `CampaignImage` and `CampaignEvent` were
  already modelled in Phase 1.
- Creation collects text only; images and lifecycle controls live on the detail
  page because images need a campaign id.
- `PATCH` is genuinely partial — the service merges the patch over the current
  form values before validating, so full-form and partial payloads both work.
- Slugs are generated once from the name at creation and stay stable on rename
  so shared public links never break.
- Lifecycle: `DRAFT→ACTIVE|ARCHIVED`, `ACTIVE→PAUSED|COMPLETED|ARCHIVED`,
  `PAUSED→ACTIVE|COMPLETED|ARCHIVED`, `COMPLETED→ARCHIVED`; `ARCHIVED` is
  terminal and read-only. Only `ACTIVE` campaigns are publicly resolvable.
- Publishing requires a headline, a description, at least one contact channel
  and a non-past end date (`400 campaign_incomplete` with field details).
- Non-archived campaigns count against the plan's `campaignLimit`
  (`409 campaign_limit_reached`); archived campaigns free a slot.
- Public pages are honest: contact actions are click-to-contact only
  (`tel:`, `mailto:`, `wa.me`) and the page states that the online enquiry form
  arrives with the leads milestone. No ad-platform publishing is implied.

### Fixed

- Creating a campaign from the dashboard no longer returns a 500. The form was
  submitting the resolver's parsed output (dates as ISO strings, `priceInPaise`
  and `interests` instead of `priceRupees`/`interestsText`), so the cross-field
  date check called `.getTime()` on a string. The form now submits the raw
  values and the schema's date checks are type-guarded, so malformed dates
  return a 400 field error instead. Full ISO datetime strings are still
  accepted, keeping API clients that send parsed dates working.

### Verified

- `npm run lint` clean · `npm run typecheck` clean · `npm run test` 105/105
  passing (15 files) · `npm run build` succeeds (38 routes).
- Live against local PostgreSQL (29 checks): plan-limit rejection, draft
  privacy, preview banner, publish/pause/resume/complete/archive, slug stability
  on rename, incomplete-publish details, image upload/remove, tenant-scoped 404s
  and MEMBER 403s. Test rows and uploads were removed; the demo plan was
  restored to Starter.
- Browser end-to-end check of the create form after the fix: the campaign saved
  with price in paise, `YYYY-MM-DD` dates as UTC midnight, interests parsed from
  the comma-separated field and the chosen industry applied; a malformed date
  payload returns `400 validation_failed` and an ISO-datetime payload creates the
  campaign. Verification rows were removed and the demo plan restored to
  Starter.

## [0.2.0] — 2026-11-11 (Session 2: Business module)

### Added

- Owner registration: `POST /api/auth/register` (rate-limited, Zod-validated,
  duplicate-email 409, scrypt hashing, audit log, console welcome email that
  honestly reports `delivered: false`) and the `/register` form with consent
  notice and password confirmation.
- Credentials sign-in: real `/login` page (react-hook-form + Zod, `callbackUrl`
  support, admin→`/admin`, everyone else→`/dashboard`) and login rate limiting
  (10 attempts/hour/IP) inside the Auth.js `authorize` callback.
- Three-step onboarding wizard at `/onboarding` (business details → logo →
  review) creating the business, OWNER membership and a 14-day TRIALING
  subscription on the starter plan in one transaction. Emits audit + in-app
  notification events.
- Business profile view/edit via `GET/PATCH /api/business/profile` and
  `/dashboard/settings` (owners and admins can edit; members get a read-only
  view). Logo uploads through `POST /api/business/logo` with type/size
  validation and owned-URL checks.
- Team invitations: `GET /api/business/team`, `POST /api/business/team/invite`
  (ADMIN/MEMBER only, 7-day expiring token, seat-limit enforcement from the
  plan, resend reuses the seat), `POST /api/business/team/invite/accept`
  (email must match the session), `/dashboard/team` and `/invite/[token]`.
  Because the console email transport cannot deliver, the invite UI always
  displays the link and states that no email was sent.
- RBAC helpers (`OWNER`/`ADMIN`/`MEMBER` capabilities) with unit tests; audit
  logging for registration, onboarding, profile updates and team changes;
  in-app notification service for team events.
- Dashboard period filter (`?period=7d|30d|90d|all`) applied to stat cards and
  recent campaigns/leads, with pure helper tests.

### Schema

- `BusinessMember.invitationExpiresAt` (nullable) + migration
  `20261111075602_invitation_expiry`. Invitation tokens are unique; expired or
  used invites are rejected by the service.

### Decisions

- Registration creates the user only; the tenant (business + membership + trial)
  is created in onboarding so a business never exists without real details.
- JWT sessions keep serving the proxy, but secure business context is always
  re-read from the database — a stale `businessId` after onboarding or accepting
  an invite is harmless.
- Ownership is never grantable by invitation. Invitations use `BusinessMember`
  rows (`status: INVITED`) rather than a separate token table.
- Email remains interface + console transport; the UI never claims delivery.

### Verified

- `npm run lint` clean · `npm run typecheck` clean · `npm run test` 72/72
  passing (12 files) · `npm run build` succeeds.
- Live end-to-end against local PostgreSQL: register → onboarding → dashboard;
  invite → second account accepts; MEMBER gets 403 on invite/profile edit;
  seeded owner/admin logins still work.

### Known pending

- Notification API routes + bell UI (service exists; lead-created events arrive
  with Phase 4).
- Campaign, lead and analytics modules (Phases 3–5).

## [0.1.0] — 2026-11-11 (Session 1: Architecture + Phase 1 foundation)

### Added

- Project documentation: `AGENTS.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`,
  `docs/DATABASE.md`, `docs/API.md`, `docs/UI_DESIGN.md`,
  `docs/IMPLEMENTATION_PLAN.md`, `docs/CHANGELOG.md`, `docs/TESTING.md`.
- Next.js 16 scaffold (App Router, TypeScript strict, Tailwind v4, Turbopack,
  ESLint CLI) named `campaignhub`.
- Dependencies: Prisma 6, Auth.js v5 (next-auth@beta), Zod 4, shadcn/ui
  (Radix + Nova preset, 23 components), Lucide, Recharts, react-hook-form,
  Sonner, Vitest.
- Prisma schema with 13 entities (User, Account/Session/VerificationToken,
  Industry, Business, BusinessMember, SubscriptionPlan, Subscription, Campaign,
  CampaignImage, CampaignEvent, Lead, LeadActivity, Notification, AuditLog,
  RateLimitLog) + offline-generated `0001_init` migration and idempotent
  seed script (industries, plans, admin, demo tenant with campaigns/leads).
- Cross-cutting: env validation, structured JSON logger, `ApiError` +
  route-handler error envelope, DB-backed sliding-window rate limiter,
  slug utilities — all with unit tests.
- Auth foundation: scrypt password hashing (+tests), Auth.js config (JWT
  sessions, credentials provider, session type augmentation), `proxy.ts`
  route protection using the Next.js 16 proxy convention.
- Adapter modules: storage (interface + local dev adapter + upload
  validation), email (interface + console transport), AI service interfaces
  (no implementations — Phase 7).
- UI: CampaignHub design tokens (indigo/slate, dark tokens defined),
  marketing layout + pages (Home, About, Features, Industries, Pricing,
  Contact), dashboard shell + home with real stat queries, admin shell +
  home, branded 404/500 pages, `/api/health`.

### Decisions

- Modular monolith, classic dynamic rendering (no `cacheComponents`).
- Google Cloud Run + Cloud SQL remains the deployment target; Docker config
  in Phase 8. Local dev uses local PostgreSQL (Docker absent on this machine).
- Email = interface + console transport (no fake delivery). Currency INR
  (paise integers). Light theme only, dark-ready tokens.
- Login/register pages are Phase 2 (Session 2) by agreed scope.

### Verified

- `npm run lint`, `npm run typecheck`, `npm run test` (48 tests, 9 files) and
  `npm run build` all pass.
- Live PostgreSQL 14 database `campaignhub`: `0001_init` applied and seed run
  twice (idempotent). `/api/health` reports `database: up`.
- End-to-end: owner sign-in renders the business dashboard with real lead
  stats; platform admin sign-in renders `/admin`; business users are redirected
  away from `/admin`; anonymous `/dashboard` and `/admin` redirect to `/login`.

### Known pending

- Login/register/onboarding form UI and business registration flows (Phase 2).
- Campaign, lead and analytics modules (Phases 3–5).
