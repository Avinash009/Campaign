# CampaignHub — Testing Strategy

**Version:** 0.1.0 · **Updated:** 2026-11-15

## 1. Principles

1. **Real behavior only.** Tests exercise actual code paths (services, route handlers) against a real PostgreSQL test database — no mocked-away reality. Mocks are allowed only for outbound integrations (email/storage) at their adapter boundaries.
2. **Every phase gate:** `npm run lint && npm run typecheck && npm run test` must pass before a phase is called complete (plus `npm run build` for phase boundaries).
3. **Honest coverage.** Prioritize: tenant isolation, auth/RBAC, validation, rate limiting, money/date logic, campaign lifecycle transitions, lead funnel math. Do not chase a coverage number; cover risk.

## 2. Layers

| Layer | Tool | Location | Scope |
|---|---|---|---|
| Unit | Vitest | `src/modules/**/​*.test.ts`, `src/lib/**/*.test.ts` | pure functions: schemas, slugs, passwords, rate-limit math, upload validation |
| API integration | Vitest | `tests/api/**/*.test.ts` | route handlers against test DB (auth cookie via Auth.js test login or direct JWT minting) |
| E2E | Playwright | `tests/e2e/**/*.spec.ts` (Phase 8) | register → onboarding → campaign → publish → enquiry → lead management |

### Test database

Integration tests use a dedicated database (e.g. `campaignhub_test`) via `DATABASE_URL_TEST` env. Setup helper (Phase 2): run `prisma migrate deploy` + minimal fixtures per suite, truncate between tests. **Never point tests at a database containing real data.**

## 3. Test cases by module

### Auth (P1–P2)

- password: hash → verify ok; wrong password fails; malformed stored hash rejected; hashes are salted (two hashes of same password differ)
- login endpoint: correct credentials → session cookie; wrong password → 401 `CredentialsSignin`; inactive user → 401; rate limit → 429
- register: duplicate email → 409; weak password → 400; zod field errors shape
- proxy: unauthenticated `/dashboard` → redirect `/login`; authenticated `/login` → redirect `/dashboard`; `/admin` non-admin → redirect away

### Tenancy & RBAC (P2+)

- every tenant-scoped endpoint returns 404 (not 403) when the resource belongs to another business (no existence leak)
- MEMBER cannot invite/update profile; OWNER/ADMIN can; revoked member loses access
- platform admin endpoints reject business users

### Campaigns (P3)

- create: validation per section; slug generated from name; unique slug collision → suffix `-2`
- lifecycle: DRAFT→ACTIVE requires headline + CTA; ACTIVE→PAUSED/COMPLETED ok; ARCHIVED terminal; invalid transitions → 400
- images: rejects >5MB, wrong content type, non-image extension; stores via local adapter in test env
- public fetch: only `ACTIVE` campaigns by slug; drafts 404

### Leads (P4)

- enquiry intake: missing consent → 400; missing phone → 400; rate limit 429 with Retry-After; duplicate phone+campaign <24h → returns existing reference, no new row
- status update: NEW→CONTACTED…→CONVERTED path records LeadActivity with from/to; LOST sets lostAt
- assignment: only OWNER/ADMIN can assign; MEMBER sees assigned-only in list
- CSV export: filters honored; header + rows correct; phone format preserved

### Analytics (P5)

- period parsing falls back to 30 days; `7d`/`30d`/`90d` windows are whole IST
  days and `all` uses monthly buckets (dense buckets, empty periods included)
- conversion rate = leads / unique visitors × 100, one decimal; zero visitors →
  `null` (no division error, UI shows `—`); leads without tracked views may push
  the rate above 100% and that is intentional
- aggregation: unique visitors are distinct per window/bucket; campaigns with no
  activity still appear with zero; locations fold blank cities into `Not shared`;
  status breakdown always returns the six statuses in pipeline order
- visitor helpers: UUID/opaque ids of 8–64 safe characters; raw `Cookie` header
  parsing including empty values and embedded `=`
- page-view beacon schema: accepts only `PAGE_VIEW` (normalises `page_view`),
  rejects `FORM_SUBMIT`, short/unsafe ids and over-long filters

### Analytics/dashboard math (pure unit)

- rate-limit window: allow N, deny N+1, retryAfter computed from oldest entry
- money formatting: paise → `₹1,23,456` style display helper (`formatInr`, covered)

### Platform admin (P6)

- admin list query parsing: defaults (page 1, 10 rows), valid status/search,
  repeated params take the first value, blank search dropped, unknown status or
  oversized page size fall back to defaults
- business status: only `ACTIVE`/`SUSPENDED` accepted; anything else is a
  validation error
- money: whole rupees → integer paise (`999` → `99900`); blank, negative and
  non-numeric input rejected
- feature lists: split on newlines/commas, trimmed, de-duplicated, capped at 12;
  omitted field stays `undefined` on update
- industry/plan create: slug may be blank (auto-generated server-side); unsafe
  slugs, short names and invalid intervals rejected
- plan update: transforms only fields supplied; blank limits mean unlimited
- authorization: every `/api/admin/*` route returns `401` anonymous and `403`
  for a business user; admin pages redirect non-admins to `/dashboard`
- suspension: public campaign pages return `404` while the business is
  `SUSPENDED` and `200` after reactivation; audit rows are written for both
  transitions

## 4. Execution

```bash
npm run test           # all Vitest suites (unit today; integration from P2)
npm run test:watch     # watch mode
npm run test -- src/lib/rate-limit.test.ts   # single file
npx playwright test     # Phase 8 (after `npx playwright install`)
```

## 5. CI gate (Phase 8)

Pipeline: install → lint → typecheck → unit → integration (with Postgres service) → build → e2e (preview build). Failing any step blocks merge.

## 6. Current status

- ✅ Phase 1 unit tests — 48 tests across 9 files: `password.test.ts`,
  `slug.test.ts`, `rate-limit.test.ts`, `errors.test.ts`, `env.test.ts`,
  `format.test.ts`, `subscriptions/service.test.ts`, `email/index.test.ts`,
  `storage/index.test.ts`
- ✅ Phase 2 unit tests — 72 tests across 12 files (adds `auth/rbac.test.ts`,
  `business/schemas.test.ts`, `dashboard/service.test.ts`). Covers role
  capabilities, onboarding/profile/invite validation (including empty-string
  transforms and ownership not being invitable) and dashboard period parsing.
- ✅ Phase 3 unit tests — 105 tests across 15 files (adds
  `campaigns/schemas.test.ts`, `campaigns/lifecycle.test.ts`,
  `campaigns/service.test.ts`). Covers rupees → paise, date/age validation,
  slug collision handling, lifecycle transitions, publish blockers and list
  query parsing.
- ✅ Phase 4 unit tests — 146 tests across 17 files (adds
  `leads/helpers.test.ts`, `leads/schemas.test.ts`). Covers phone
  normalisation, status timestamp rules, IST follow-up parsing and day
  boundaries, CSV escaping/BOM, enquiry/list/action schemas and filter
  serialisation; `format.test.ts` now also covers `formatPhone`,
  `phoneTelHref` and `phoneWhatsAppHref`.
- ✅ Phase 5 unit tests — 176 tests across 20 files (adds
  `analytics/helpers.test.ts`, `analytics/schemas.test.ts`, `lib/visitor.test.ts`).
  Covers IST periods and dense buckets, conversion math, summary/performance/
  campaign/location/status aggregation, analytics query parsing/serialisation,
  the page-view beacon schema and visitor cookie parsing.
- ✅ Phase 6 unit tests — 193 tests across 21 files (adds
  `admin/schemas.test.ts`, 17 tests). Covers admin list query parsing, the
  business-status enum, rupee → paise conversion, feature-list splitting,
  industry/plan create/update transforms and admin validation errors.
- ✅ Manual e2e against the live database (2026-11-15, platform admin):
  statistics/business/industry/plan/campaign APIs returned `200` with live
  data; search and filters worked; suspend → public page `404` → reactivate
  `200`; industry create/rename/deactivate; plan create/price change/deactivate
  (₹1999 → `199900` paise, features split, inactive hidden from pricing);
  invalid payloads `400`; owner `403` on all admin APIs and `/admin` →
  `/dashboard`; anonymous admin access `401`; verification rows and audit
  entries removed and demo counts restored.
- ✅ Manual e2e against the live database (2026-11-13, analytics): public beacon
  `202` writes `PAGE_VIEW` with UTM, DRAFT campaign `404`, invalid visitor `400`,
  enquiry with `ch_visitor` stores `visitorId` and writes `FORM_SUBMIT`, a real
  landing-page visit sets the cookie and beacons, owner preview writes nothing,
  and the analytics page/API render 30-day, 7-day and campaign-filtered views.
- ✅ Manual e2e against the live database (2026-11-11): health endpoint, DB-backed
  home/pricing, owner & admin credential login, RBAC redirects, anonymous
  redirects; register → onboarding → business/membership/trial created;
  invite → accept → MEMBER 403s on management endpoints.
- 🔜 API integration harness (`tests/api/**`): still pending; the Phase 2 flows
  were verified with live HTTP calls against the dev server. A dedicated
  `campaignhub_test` database and fixtures remain the next testing investment.
- 🔜 Playwright: Phase 8
