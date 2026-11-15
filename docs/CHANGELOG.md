# Changelog

All notable changes to CampaignHub are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versioning is
[SemVer](https://semver.org/).

## [0.7.0] — 2026-11-15 (Session 7: AI integration)

### Added

- AI module (`src/modules/ai/`) behind interfaces: `AiContentService`
  (provider-backed), `AiCampaignAssistant`, `AiLeadQualificationService` and
  `AiFollowUpService` (rule-based), plus Zod input schemas, prompt builders, CTA
  matching, response parsing and tenant orchestration in `service.ts`.
- Provider adapter for any OpenAI-compatible chat-completions endpoint
  (`provider.ts`): one `fetch` call, `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL` /
  `AI_BASE_URL` / `AI_TIMEOUT_MS`, strict timeout, no SDK and no fallback text.
  `AI_PROVIDER=none` (the default) keeps the app fully functional with
  generation disabled.
- Ad copy generation (`headlines`, `descriptions`, `suggestedCtas`) and
  landing-page content generation (headline, promo description, product details,
  offer, suggested CTA), both Owner/Admin only, limited to 20 requests per hour
  per business and audited (`ai.ad_copy_generated`,
  `ai.landing_content_generated`).
- AI API routes: `GET /api/ai/status`, `POST /api/ai/ad-copy`,
  `POST /api/ai/landing-content`, `GET /api/ai/campaigns/:id/review`,
  `GET /api/ai/leads/:id/qualification`, `GET /api/ai/leads/:id/follow-up`.
- Campaign form AI panel (new/edit campaign): tone select, ad-copy and
  landing-content generation, per-item "Use" and "Use all" that only fill the
  editable fields (never save), the provider/model footnote, and an honest
  explanation when no provider is configured.
- Rule-based campaign review card on campaign detail: content gaps and measured
  last-30-day landing-page activity, each item naming the field or number to act
  on, with a "Rule-based" badge.
- Rule-based lead qualification card on lead detail: hot/warm/cold category, a
  `/100` score where every point is listed, and questions worth asking. No
  probability or purchase prediction is shown.
- Rule-based follow-up assistant card on lead detail: priority, summary, next
  action, suggested timing, cautions, and call/WhatsApp/email drafts with
  copy-to-clipboard and open-in-dialler/WhatsApp/email links. CampaignHub never
  sends a message.
- 74 unit tests across 8 files (`schemas`, `cta`, `parsing`, `prompts`,
  `provider`, `campaign-assistant`, `lead-qualification`, `follow-up`), including
  stubbed-`fetch` coverage of success, `401`/`403`, quota exhaustion, generic
  `429`, other statuses, empty/unreadable completions, aborts and network
  failures.

### Changed

- Provider failures now map to specific `503` codes instead of one generic
  error: `ai_not_configured`, `ai_provider_auth`, `ai_quota_exhausted`,
  `ai_provider_rate_limited`, `ai_provider_error`, `ai_invalid_response`,
  `ai_timeout`, `ai_unavailable`. Messages never echo the API key or the raw
  provider payload, and provider logs record `errorType`/`errorCode`.
- `requireApiBusinessContext()` now returns `401 unauthorized` for unauthenticated
  API callers and reserves `403 forbidden` for signed-in users without an active
  business (previously both returned `403`).

### Decisions

- Two honest layers: only ad copy and landing copy are model-generated; the
  campaign assistant, lead qualification and follow-up drafts are deterministic
  functions over the business's own data, labelled "Rule-based" and returning
  `basedOn: "rules"`. No fake AI and no predicted outcomes.
- If no provider is configured (or the provider fails), the generation endpoints
  fail with an actionable error. There is no template fallback that could look
  like model output.
- Prompts forbid invented statistics, awards, customer quotes, guarantees and
  any claim that CampaignHub publishes to Google/Meta Ads. Only user-supplied
  facts are used.
- Generation is a write-like action (costs money, produces campaign content), so
  it is restricted to owners/admins, rate-limited per business and audited;
  rule-based reads follow the normal member scoping (members only see their own
  leads).
- Drafted messages are never sent by the platform: the user copies the text or
  opens their own phone, WhatsApp or email app.

### Verified

- No Prisma migration needed. `npm run lint` clean · `npm run typecheck` clean ·
  `npm run test` 267/267 passing (29 files) · `npm run build` succeeds.
- Live against local PostgreSQL with a real OpenAI-compatible configuration:
  `GET /api/ai/status` → `{ configured: true, provider: "openai", model:
  "gpt-4o-mini" }`; campaign review `200` with `basedOn: "rules"` (content-gap
  improvement plus "converting at 50.0% from 87 page views"); lead qualification
  `200` with `category: "warm"`, `score: 63` and eight listed reasons; follow-up
  `200` with priority, next action, timing and call/WhatsApp/email drafts built
  from the lead's own details.
- Guard rails verified live: short `productDetails` → `400 validation_failed`;
  anonymous → `401 unauthorized`; MEMBER `POST /api/ai/ad-copy` → `403`; MEMBER
  qualification for a lead assigned to someone else → `404 not_found`, their own
  lead → `200`.
- Provider caveat: the configured OpenAI key authenticates (`/v1/models` →
  `200`, `gpt-4o-mini` present) but its account has no credits, so chat
  completions return `429 insufficient_quota` / `credit_balance_exhausted`. Both
  generation endpoints returned `503 ai_quota_exhausted` with an actionable
  message and produced no copy. Adding credits in the provider dashboard is the
  only remaining step for live model output; the success path is covered by the
  stubbed-`fetch` tests.

## [0.6.0] — 2026-11-15 (Session 6: Platform administration)

### Added

- Platform-admin module (`src/modules/admin/`): Zod input/query schemas
  (including rupee → paise and feature-text helpers), a deliberately
  cross-tenant repository (`*Platform*` names), services for statistics,
  business suspension, industry/plan management and campaign monitoring, and
  read-model types.
- Admin API routes (admin only): `GET /api/admin/statistics`,
  `GET /api/admin/businesses`, `PATCH /api/admin/businesses/:id/status`,
  `GET/POST /api/admin/industries`, `PATCH /api/admin/industries/:id`,
  `GET/POST /api/admin/plans`, `PATCH /api/admin/plans/:id` and
  `GET /api/admin/campaigns`.
- Expanded platform overview (`/admin`): businesses/active/suspended, users and
  pending invitations, campaigns/active, leads and new leads (7 days), tracked
  page views, server-recorded enquiries, trial and active subscriptions, newest
  businesses and management shortcuts.
- Business directory (`/admin/businesses`): search by business/owner/email,
  status filter, pagination, plan/subscription, counts, and suspend/reactivate
  with a confirmation dialog. Suspension takes public campaign pages offline
  immediately; data and team are retained.
- Industry management (`/admin/industries`): list with usage counts, create,
  edit, activate/deactivate and sort order; slugs auto-generate. Unknown icon
  keys fall back to a generic icon, so new industries remain data-only.
- Subscription plan management (`/admin/plans`): create/edit price (rupees in
  the form, integer paise in the database), interval, campaign/member limits,
  feature list, featured/active flags and sort order; deactivating hides a plan
  from pricing and new subscriptions.
- Campaign monitoring (`/admin/campaigns`): read-only cross-tenant list with
  business, status, page views, enquiries, leads and a public-page link only
  when both campaign and business are active.
- `requireApiPlatformAdmin()` route-handler guard; admin navigation items are
  now all enabled.
- Audit rows for admin mutations (`admin.business_suspended`,
  `admin.business_activated`, `admin.industry_created`,
  `admin.industry_updated`, `admin.plan_created`, `admin.plan_updated`).
- 17 unit tests for admin schemas (list query parsing, status enum, rupee →
  paise, feature splitting, industry/plan create/update transforms).

### Decisions

- Admin operations are cross-tenant by design. Repository functions are named
  `*Platform*` and are reachable only through `requirePlatformAdmin()` /
  `requireApiPlatformAdmin()`, keeping the exception grep-able in review.
- Defence in depth: the admin layout and every admin page re-check the flag;
  each route handler checks it again.
- Plan and industry forms send raw strings; the server re-validates and
  performs transforms. `planFormSchema` is validation-only so react-hook-form
  and the API share the same rules without pre-transforming values.
- Plan prices are entered in whole rupees and stored as integer paise; feature
  text is split on newlines/commas (max 12).
- Campaign monitoring is read-only: campaign lifecycle changes stay with the
  owning business.
- Business suspension affects public pages only. Blocking dashboard access for
  suspended tenants is intentionally out of Phase 6 scope.

### Verified

- `npm run lint` clean · `npm run typecheck` clean · `npm run test` 193/193
  passing (21 files) · `npm run build` succeeds (62 routes, 4 admin pages + 8
  admin APIs).
- Live against local PostgreSQL and the browser: admin statistics/business/
  industry/plan/campaign APIs returned `200` with live data; search and status
  filters worked; suspension made `/c/luxury-apartments-hyderabad` return `404`
  and reactivation restored `200`; industry and plan create/update/deactivate
  worked (₹1999 → `199900` paise, features split, inactive hidden from public
  pages); invalid payloads returned `400 validation_failed`; an owner received
  `403` from all admin APIs and a `/admin` → `/dashboard` redirect; anonymous
  admin access returned `401`. Verification rows and audit entries were
  removed; demo counts restored to 87 page views, 6 enquiries and 6 leads.

## [0.5.0] — 2026-11-13 (Session 5: Analytics)

### Added

- Analytics module (`src/modules/analytics/`): pure helpers for IST period
  windows, dense daily/monthly chart buckets, conversion math and aggregation, a
  tenant-scoped repository and a service powering the overview, page-view
  recording and server-side form-submit events.
- First-party page-view tracking: `/c/[slug]` sets an anonymous `ch_visitor`
  cookie (one year, `SameSite=Lax`) and sends one beacon per visit to
  `POST /api/public/campaigns/:slug/events`. Do Not Track and Global Privacy
  Control are respected, storage failures are ignored and analytics never blocks
  the landing page. The owner preview never tracks.
- `FORM_SUBMIT` events are written by the lead service after a successful
  enquiry, using the visitor cookie, so a browser cannot fake conversions.
  Failures are logged (`analytics.form_submit_failed`) but never fail the
  enquiry.
- Analytics dashboard (`/dashboard/analytics`): six summary cards (page views,
  unique visitors, enquiries, conversion rate, qualified, converted), a
  performance-over-time chart (views/visitors left axis, enquiries right axis),
  campaign comparison and current-status charts, a per-campaign performance table
  and a leads-by-location table, with empty states.
- Period presets (`7d`, `30d`, `90d`, `all`) and a campaign filter mirrored in
  the URL; dashboard home now shows leads-over-time, campaign comparison and
  conversion-rate charts.
- Analytics APIs: `GET /api/analytics/summary`, `leads-over-time`,
  `campaign-performance` and `leads-by-location` (any active member; business
  scoped).
- Analytics enabled in the dashboard navigation.
- Unit tests for analytics helpers, query/beacon schemas and visitor cookie
  helpers (30 new tests).

### Decisions

- Periods are whole IST calendar days: `7d` = today + 6 previous days, `30d` =
  today + 29, `90d` = today + 89. `all` uses monthly buckets; presets use daily
  buckets with empty days included.
- Conversion rate = `(enquiries ÷ unique visitors) × 100`, one decimal, and is
  `null` (shown as `—`) when no page views were tracked. It is not capped at
  100% because leads can exist without a tracked visit; the UI states this
  honestly.
- Events are append-only; unique visitors are counted per window with
  `COUNT(DISTINCT visitorId)` computed in the service.
- `CampaignEvent` has no `businessId`; analytics reads are isolated through the
  campaign relation (`campaign.businessId`), which is the only tenant boundary
  for events.
- The beacon accepts only `PAGE_VIEW`; `FORM_SUBMIT` is server-only. A missing
  or invalid visitor id is ignored rather than invented.
- Analytics is business-wide for every active member, including MEMBER, matching
  `docs/API.md`; it reveals aggregate numbers, not other members' lead details.

### Verified

- `npm run lint` clean · `npm run typecheck` clean · `npm run test` 176/176
  passing (20 files) · `npm run build` succeeds (54 routes, 6 new).
- Live against local PostgreSQL and the browser: beacon `202` created a
  `PAGE_VIEW` with UTM source; DRAFT campaign `404`; bad visitor id
  `400 validation_failed`; enquiry with `ch_visitor` stored `visitorId` and wrote
  `FORM_SUBMIT`; a real landing-page visit set the cookie and beaconed while the
  owner preview created nothing; analytics rendered 30-day, 7-day and
  single-campaign views with charts and tables; unknown period fell back to 30
  days; authenticated analytics APIs returned `200`, anonymous access was
  blocked. Verification rows were removed and the demo business restored to 87
  page views, 6 form submits and 6 leads.

## [0.4.0] — 2026-11-13 (Session 4: Lead module)

### Added

- Lead module (`src/modules/leads/`): pure helpers (phone normalisation,
  status timestamp rules, IST follow-up parsing, CSV escaping/building), Zod
  schemas for enquiries, list filters and dashboard actions, a tenant-scoped
  repository and a service covering intake, list/detail reads, status,
  assignment, notes, follow-ups and export.
- Public enquiry form on every campaign landing page with a required consent
  checkbox, an inline privacy notice, a hidden honeypot, UTM/referrer capture,
  a success state with a short reference and a clear duplicate state. The owner
  preview renders the same form disabled so no test leads are created.
- `POST /api/public/campaigns/:slug/enquiry`: 5/hour/IP, Zod validation,
  honeypot rejection (`400 invalid_submission`) and a soft 24-hour duplicate
  check (same phone + campaign) that returns the original reference with
  `duplicate: true`.
- Lead APIs: `GET /api/leads` (filters + pagination), `GET /api/leads/:id`,
  `PATCH /api/leads/:id/status`, `PATCH /api/leads/:id/assign`,
  `POST /api/leads/:id/notes`, `POST /api/leads/:id/follow-up`,
  `POST /api/leads/:id/follow-up/complete` and `GET /api/leads/export`.
- Dashboard lead inbox (`/dashboard/leads`) with search, status/campaign/
  assignee/date filters, pagination and a filtered CSV export link.
- Lead detail (`/dashboard/leads/[id]`): click-to-call, WhatsApp and email
  actions, enquiry details, activity timeline, status and assignment controls,
  notes, follow-up scheduling/completion, campaign link, consent record, UTM
  fields and a summary card.
- Leads enabled in the dashboard navigation; dashboard recent enquiries link to
  the lead detail; campaign lead counts link to the filtered lead list.
- Unit tests for lead helpers, schemas, filter parsing and phone formatting
  (41 new tests).

### Decisions

- Phones are stored as digits with the country code (`919845123456`); the
  duplicate check also matches older/seed rows stored as `+91…`.
- Status changes are permissive (`NEW→LOST→NEW` is allowed) and keep exactly one
  outcome timestamp: `CONVERTED` sets `convertedAt`, `LOST` sets `lostAt`,
  `CONTACTED` sets `lastContactedAt`, and reversing an outcome clears it.
  `lastContactedAt` remains as history after the status moves on.
- Follow-up dates accept a date-only input (`YYYY-MM-DD`), stored as 09:00 IST,
  or a full ISO timestamp; only today or a future IST date is accepted.
- MEMBER access is enforced in the service: members list and edit only leads
  assigned to them, and an unassigned lead is a `404` rather than a `403` so its
  existence is not revealed. Only owners/admins can assign.
- New enquiries notify all active owners/admins (`LEAD_CREATED`); assignment
  notifies the assignee (`LEAD_ASSIGNED`). Status, assignment and export actions
  are audit-logged.
- CSV export lives at `/api/leads/export`, reuses the list filters, is capped at
  5,000 rows (`400 export_too_large`), guards against spreadsheet formula
  injection, and writes a UTF-8 BOM with CRLF line endings and ISO/UTC dates.
- Public enquiries do not write a `CampaignEvent`: `FORM_SUBMIT` needs a real
  visitor id, which arrives with Phase 5 page-view tracking. Analytics can count
  leads instead.
- There is no `/privacy` page yet, so the fixed privacy notice is shown inline
  on the enquiry form. CampaignHub never calls or messages the customer.

### Verified

- `npm run lint` clean · `npm run typecheck` clean · `npm run test` 146/146
  passing (17 files) · `npm run build` succeeds (48 routes, 11 new).
- Live against local PostgreSQL and the browser: valid enquiry `201` (normalised
  phone, consent text, UTM and `CREATED` activity stored), duplicate `200` with
  the same reference, honeypot `400 invalid_submission`, missing consent and
  malformed phone `400 validation_failed`, sixth request in the hour `429` with
  `Retry-After`; owner list/filter/CSV export, status transitions with timestamp
  side effects, notes, 09:00 IST follow-up + completion and assignment; member
  sees only assigned leads, `404` on an unassigned lead, `403` on assignment and
  can still update their own lead; preview form disabled; dashboard and campaign
  links resolve. Test leads, activities, notifications, audit rows and rate-limit
  rows were removed; the demo business is back to 6 leads on Starter.

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
