# Changelog

All notable changes to CampaignHub are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versioning is
[SemVer](https://semver.org/).

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
