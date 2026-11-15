# CampaignHub — API Design

**Version:** 0.1.0 · Base path: `/api` · All request/response bodies are JSON unless noted.

## 1. Conventions

- **Auth:** Auth.js session cookie (httpOnly, SameSite=Lax, JWT). `401` unauthenticated, `403` unauthorized. Business endpoints require an active membership; the tenant is resolved from the session, never from the request body.
- **Validation:** Zod schemas server-side; invalid input → `400` with per-field details.
- **Error envelope:**

```json
{ "error": { "code": "campaign_not_found", "message": "Campaign not found.", "details": {} } }
```

Common codes: `validation_failed`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `rate_limited`, `internal_error`.

- **Pagination:** list endpoints accept `?page=1&pageSize=20` and return `{ data: [...], pagination: { page, pageSize, total, totalPages } }`.
- **Rate limits:** public endpoints return `429` with `Retry-After` seconds. Enquiry submit: 5/hour/IP; login/register: 10/hour/IP.
- **Success:** `200` (GET/PUT/PATCH), `201` (POST create).

## 2. Authorization matrix

| Area | Endpoint prefix | Who |
|---|---|---|
| Auth | `/api/auth/*` | Public (Auth.js handlers) |
| Public campaign | `/api/public/campaigns/*` | Public, rate-limited |
| Business self | `/api/business/*` | Owner/Admin unless noted (profile, team, subscription) |
| Campaigns | `/api/campaigns/*` | Member: read; Owner/Admin: write |
| Leads | `/api/leads/*` | Member: assigned leads + notes/status on assigned; Owner/Admin: all in business |
| Analytics | `/api/analytics/*` | Any active member |
| Admin | `/api/admin/*` | Platform admin only |

## 3. Endpoint catalog

> Status column: ✅ implemented · 🔜 planned phase (P2…P6). Phase 1 implements the auth route plumbing + health; Phase 2 adds registration, onboarding, business profile and team invitations.

### Auth & session

| Method | Path | Description | Status |
|---|---|---|---|
| * | `/api/auth/[...nextauth]` | Auth.js handlers (login, logout, session) | ✅ P1 |

### Registration & onboarding (P2)

| Method | Path | Body / Response | Status |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` → `201 { userId, welcomeEmailDelivered }` | ✅ P2 |
| POST | `/api/business/onboarding` | `{ businessName, businessEmail, phone, industrySlug, website?, city?, state?, description?, logoUrl? }` → `201 { businessId, slug }` | ✅ P2 |
| POST | `/api/business/logo` | multipart image (`file`) → `200 { logoUrl }` | ✅ P2 |
| GET/PATCH | `/api/business/profile` | business profile read/update (PATCH: Owner/Admin) | ✅ P2 |
| GET | `/api/business/team` | members + seats + plan name | ✅ P2 |
| POST | `/api/business/team/invite` | `{ email, role: ADMIN\|MEMBER }` → `201 { invitationId, inviteUrl, emailDelivered, expiresAt }` (Owner/Admin; console transport reports `false`) | ✅ P2 |
| POST | `/api/business/team/invite/accept` | `{ token }` → `200 { businessId, businessName, role }`; invitation email must match the session | ✅ P2 |

### Industries (P2)

| Method | Path | Description | Status |
|---|---|---|---|
| GET | `/api/industries` | active industries (public) | ✅ P2 |

### Campaigns (P3)

All campaign endpoints require a business session; tenant-owned reads/writes are
scoped by the session `businessId`. `PATCH` bodies may be partial. The owner
preview page is a server page at `/preview/campaigns/:id` (not an API route).

| Method | Path | Body / Response | Status |
|---|---|---|---|
| GET | `/api/campaigns?page&pageSize&status&search` | paginated campaigns for session business → `200 { data: { items, total, page, pageSize, totalPages } }` | ✅ P3 |
| POST | `/api/campaigns` | full campaign payload (basic + promo + targeting + CTA) → `201 { id, slug }`; Owner/Admin; `409 campaign_limit_reached` when the plan is full | ✅ P3 |
| GET | `/api/campaigns/:id` | campaign detail (images included) | ✅ P3 |
| PATCH | `/api/campaigns/:id` | partial update merged over current values; `409 campaign_archived` for archived campaigns | ✅ P3 |
| POST | `/api/campaigns/:id/status` | `{ status }` — publish/pause/resume/complete/archive with lifecycle validation → `200 { id, status, publicUrl }`; `400 campaign_incomplete`, `409 invalid_status_transition` | ✅ P3 |
| POST | `/api/campaigns/:id/images` | multipart `images[]` (JPG/PNG/WebP ≤5 MB, max 8 per campaign) → `201 { data: [...] }`; 60/hour/business | ✅ P3 |
| DELETE | `/api/campaigns/:id/images/:imageId` | remove image row + stored file → `200 { ok: true }` | ✅ P3 |

### Public campaign & enquiries (P3/P4)

| Method | Path | Description | Status |
|---|---|---|---|
| GET | `/api/public/campaigns/:slug` | published campaign data for the landing page (ACTIVE campaign + ACTIVE business only) → `200 { data }` or 404; 120/hour/IP | ✅ P3 |
| POST | `/api/public/campaigns/:slug/events` | `{ type: "page_view", visitorId, referrer?, utm… }` → `202 { data: { recorded: true } }`; only `PAGE_VIEW` is accepted from browsers, only ACTIVE campaigns of ACTIVE businesses (otherwise `404`), 120/hour/IP → `429`; the visitor id must be 8–64 `[A-Za-z0-9_-]` characters | ✅ P5 |
| POST | `/api/public/campaigns/:slug/enquiry` | `{ name, phone, email?, city?, interestedIn?, message?, consent: true, website?, utm…, referrer? }` → `201 { data: { reference, duplicate: false } }`; same phone + campaign within 24h → `200 { data: { reference, duplicate: true } }`; `400 invalid_submission` for the honeypot, `400 validation_failed`, `404` for unpublished campaigns; 5/hour/IP → `429` + `Retry-After` | ✅ P4 |

### Leads (P4)

All lead endpoints require a business session and are scoped to the session
`businessId`. Members see and edit only leads assigned to them; owners/admins
see the whole inbox. The list filters are shared by the CSV export.

| Method | Path | Description | Status |
|---|---|---|---|
| GET | `/api/leads?status&campaignId&assignedTo&from&to&search&page&pageSize` | filtered list → `200 { data, pagination }`; `assignedTo` accepts `me`, `unassigned` or a teammate id (ignored for members) | ✅ P4 |
| GET | `/api/leads/:id` | detail incl. activity timeline → `200 { data }`; `404` when missing or assigned to another member | ✅ P4 |
| PATCH | `/api/leads/:id/status` | `{ status, note? }` → records `STATUS_CHANGED`, updates outcome timestamps | ✅ P4 |
| PATCH | `/api/leads/:id/assign` | `{ userId \| null }` (Owner/Admin) → records `ASSIGNED`, notifies the assignee | ✅ P4 |
| POST | `/api/leads/:id/notes` | `{ note }` → `201`, records `NOTE_ADDED` | ✅ P4 |
| POST | `/api/leads/:id/follow-up` | `{ scheduledFor, note? }` (`YYYY-MM-DD` → 09:00 IST, or ISO; today/future only) → `201`, records `FOLLOW_UP_SCHEDULED` | ✅ P4 |
| POST | `/api/leads/:id/follow-up/complete` | `{ note? }` → clears `nextFollowUpAt`, sets `lastContactedAt`, records `FOLLOW_UP_COMPLETED`; `409 no_follow_up` | ✅ P4 |
| GET | `/api/leads/export?filters…` | CSV with the same filters as the list → `text/csv` (UTF-8 BOM, CRLF, ISO/UTC dates); max 5,000 rows → `400 export_too_large`; audit-logged | ✅ P4 |

### Analytics (P5)

All analytics endpoints require an active business membership (any role) and are
scoped to the session `businessId` through the campaign/lead relations. Query
params: `period=7d|30d|90d|all` (default `30d`) and optional `campaignId`.
Presets are whole IST calendar days; `all` aggregates by month. Responses use the
usual `{ data, meta }` envelope. `FORM_SUBMIT` events are written server-side
with the enquiry (a browser cannot post them).

| Method | Path | Description | Status |
|---|---|---|---|
| GET | `/api/analytics/summary?period&campaignId` | page views, unique visitors, enquiries, conversion rate (`null` with no tracked views), qualified and converted leads | ✅ P5 |
| GET | `/api/analytics/leads-over-time?period&campaignId` | dense buckets with page views, unique visitors and lead counts (daily for presets, monthly for all time) | ✅ P5 |
| GET | `/api/analytics/campaign-performance?period&campaignId` | per-campaign views/visitors/leads/conversion, sorted by leads | ✅ P5 |
| GET | `/api/analytics/leads-by-location?period&campaignId` | enquiry counts and share by city (`Not shared` when absent) | ✅ P5 |

### Notifications (P2+)

| Method | Path | Description | Status |
|---|---|---|---|
| GET | `/api/notifications` | my notifications | 🔜 P4 (notification service exists: team + onboarding events) |
| POST | `/api/notifications/:id/read` | mark read | 🔜 P4 |

### Platform admin (P6)

Every endpoint requires the platform-admin flag (`isPlatformAdmin`); business
users receive `403` and anonymous callers `401`. These are the only cross-tenant
reads/writes in the app and are guarded by `requireApiPlatformAdmin()`. List
responses use `{ data, meta: { page, pageSize, total, totalPages } }`.

| Method | Path | Description | Status |
|---|---|---|---|
| GET | `/api/admin/statistics` | platform totals: businesses (active/suspended), users + pending invitations, campaigns (active), leads + last 7 days, page views, enquiries, trial/active subscriptions | ✅ P6 |
| GET | `/api/admin/businesses?page&pageSize&status&search` | paginated directory; search matches business name/slug/email and owner name/email; `status=ACTIVE\|SUSPENDED` | ✅ P6 |
| PATCH | `/api/admin/businesses/:id/status` | `{ status: "ACTIVE" \| "SUSPENDED" }` → `200 { data: { id, status } }`; suspension takes public pages offline, audit-logged | ✅ P6 |
| GET | `/api/admin/industries` | full catalog incl. inactive rows, usage counts and sort order | ✅ P6 |
| POST | `/api/admin/industries` | `{ name, slug?, description?, iconKey?, sortOrder, isActive }` → `201 { data: { id, slug, name } }`; slug auto-generated, `409 slug_taken` | ✅ P6 |
| PATCH | `/api/admin/industries/:id` | partial fields incl. `isActive`; deactivation hides the industry from onboarding/marketing pages | ✅ P6 |
| GET | `/api/admin/plans` | full catalog incl. inactive plans, amounts in paise and subscriber counts | ✅ P6 |
| POST | `/api/admin/plans` | `{ name, slug?, description?, amountRupees, interval: MONTHLY\|YEARLY, campaignLimit?, memberLimit?, featuresText?, isFeatured, isActive, sortOrder }` → `201 { data: { id, slug, name } }`; rupees converted to integer paise | ✅ P6 |
| PATCH | `/api/admin/plans/:id` | partial fields incl. `amountRupees`, limits, `featuresText` and `isActive`; deactivation hides the plan from pricing | ✅ P6 |
| GET | `/api/admin/campaigns?page&pageSize&status&search` | read-only cross-tenant monitor: business, status, page views, enquiries, leads; search matches campaign name/slug and business name/slug | ✅ P6 |

### Health

| Method | Path | Description | Status |
|---|---|---|---|
| GET | `/api/health` | `{ status, database }` — used by Cloud Run checks | ✅ P1 |

## 4. Webhooks / AI (future)

AI generation endpoints are designed as thin wrappers over `src/modules/ai/` service interfaces (Phase 7). No endpoint will be exposed before a real provider integration exists.
