# CampaignHub — Testing Strategy

**Version:** 0.1.0 · **Updated:** 2026-11-11

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

- page-view beacon: creates CampaignEvent; visitor counted once per day (client guard) — unique visitor math `COUNT(DISTINCT visitorId)` verified
- conversion rate = leads / unique visitors × 100 (rounded 1dp); zero visitors → 0, no division error
- date-range filters inclusive of both ends (IST boundary documented)

### Analytics/dashboard math (pure unit)

- rate-limit window: allow N, deny N+1, retryAfter computed from oldest entry
- money formatting: paise → `₹1,23,456` style display helper (`formatInr`, covered)

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
- ✅ Manual e2e against the live database (2026-11-11): health endpoint, DB-backed
  home/pricing, owner & admin credential login, RBAC redirects, anonymous
  redirects; register → onboarding → business/membership/trial created;
  invite → accept → MEMBER 403s on management endpoints.
- 🔜 API integration harness (`tests/api/**`): still pending; the Phase 2 flows
  were verified with live HTTP calls against the dev server. A dedicated
  `campaignhub_test` database and fixtures remain the next testing investment.
- 🔜 Playwright: Phase 8
