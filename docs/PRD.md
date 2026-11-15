# CampaignHub — Product Requirements Document

**Version:** 0.1.0 · **Status:** In development · **Owner:** Platform team
**Currency/region:** INR (₹), English UI · **Last updated:** 2026-11-11

## 1. Vision

CampaignHub is a multi-tenant SaaS platform that helps businesses across industries advertise products and services, generate customer enquiries through promotional landing pages, and manage leads to closure.

> **Headline:** Grow Your Business With Smarter Advertising & Lead Generation.

Core promise:

1. Create a business profile in minutes.
2. Launch promotional campaign pages with a shareable public URL.
3. Collect enquiries as structured, manageable leads.
4. Track performance with real analytics.
5. (Later) Improve campaigns with AI assistance.

**Honest scope note:** In the MVP, campaigns generate shareable promotional pages. The platform does **not** automatically publish to Google Ads or Meta Ads; ad-platform integrations are a future phase. AI features (Module 9) are implemented in Phase 7 with two honest layers: provider-backed copy generation that fails explicitly when no provider is configured, and deterministic rule-based review, qualification and follow-up drafts that never pretend to predict or send anything.

## 2. User roles

| Role | Description | Key capabilities |
|---|---|---|
| **Platform Administrator** | Operates the platform | Manage businesses, campaigns, industries, plans; monitor platform stats; platform settings |
| **Business Owner** | Registers the business | Business profile, team invites, campaigns, landing pages, leads, analytics, subscription |
| **Business Team Member** | Staff invited by owner | View assigned leads, update statuses, add follow-up notes, contact customers, view permitted campaign info |

### Role-based access control

- Membership roles within a business: `OWNER`, `ADMIN`, `MEMBER` (stored on `BusinessMember`).
- `OWNER`/`ADMIN`: full business management (invite members, edit profile, campaigns, leads, billing).
- `MEMBER`: lead work (assigned leads + campaign context), no billing/settings/campaign create.
- Platform admin is a flag on `User` (`isPlatformAdmin`), separate from business roles.
- Tenancy rule: a user may only access data belonging to businesses they are an active member of. Platform admins can access cross-tenant data only through explicit platform-admin operations.

## 3. Supported industries

Real Estate, Finance & Loans, Insurance, Education & Coaching, Healthcare, Retail & E-commerce, Travel & Tourism, Other. Industries are database rows (`Industry`) with slugs; adding an industry must require **no code changes** (an optional industry-specific landing template component may be added later per `docs/ARCHITECTURE.md`).

## 4. Modules & functional requirements

### Module 1 — Public website

Marketing site for the SaaS itself: Home, About, Features, Industries, Pricing, Contact, Login, Register. Home includes hero (headline above, "Start Free" + "Explore Features" CTAs), How It Works, Industries We Support, Key Features, Customer Success Stories (clearly labelled demo content), Pricing Plans, FAQ, Footer. Modern SaaS aesthetic, not a basic template (see `docs/UI_DESIGN.md`).

### Module 2 — Registration & onboarding

1. Register business owner (name, email, password).
2. Business details: name, email, contact number, industry, website, location, description.
3. Upload business logo.
4. Complete onboarding → dashboard.

Profiles editable later. Email verification is not a blocker in MVP; an email service abstraction exists (dev transport logs emails) for later phases. Passwords hashed with scrypt.

### Module 3 — Business dashboard

Summary cards: Total Campaigns, Active Campaigns, Total Leads, New Leads, Qualified Leads, Converted Leads. Charts: leads over time, campaign performance, lead conversion rate, campaign-wise lead comparison. Recent activity: recent campaigns, latest enquiries, recent status changes. Date + campaign filters. Responsive desktop/tablet/mobile.

### Module 4 — Campaign management (core)

Campaign creation captures:

- **Basic:** name, description, industry, objective, start/end date, status.
- **Promotional:** headline, promotional description, product/service details, offer details, price (optional), promotional images, video URL (optional), business contact info.
- **Targeting:** target location, audience description, age range (optional), interests (optional).
- **CTA type:** Enquire Now · Contact Us · Book Appointment · Request Callback · Get Quote · Schedule Visit.

Statuses: `DRAFT`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`. Every campaign gets a unique public URL: `/c/{slug}` (e.g. `/c/luxury-apartments-hyderabad`). Actions: preview, edit, publish, pause, archive.

### Module 5 — Industry-specific landing pages

Shared design system with industry-tailored content sections:

- **Real Estate:** property images, project name, location, apartment type, price range, amenities, description, schedule site visit, enquiry form.
- **Finance/Loans:** service info, features, eligibility, interest-rate info (business-provided, clearly qualified), request callback, enquiry form.
- **Education:** course info, duration, learning outcomes, fees, admission enquiry form.
- **Healthcare:** clinic/hospital info, services, doctor/specialist info, appointment request.
- **Retail:** product images, offers, discounts, product info, contact/purchase enquiry.
- Insurance / Travel / Other use the closest matching default template.

**Privacy rule:** lead forms must never collect bank passwords, PAN, Aadhaar, or similar sensitive credentials. Consent checkbox + privacy notice required on every enquiry form.

### Module 6 — Lead generation

A lead is created when a visitor submits a campaign enquiry form. Fields: name, mobile, email, city, interested product/service, message, campaign ID, creation date, source, UTM info, consent status. Statuses: `NEW`, `CONTACTED`, `INTERESTED`, `QUALIFIED`, `CONVERTED`, `LOST`.

Management: list/search, filter by campaign/status/date, update status, assign to team member, internal notes, follow-up dates, CSV export. Protections: spam rate limiting, server-side validation, duplicate enquiry handling (same phone + campaign within a window).

### Module 7 — Lead details

Detailed page: customer details, campaign info, source, status, assignee, activity timeline, follow-up notes, next follow-up date. Quick actions: call (`tel:`), email (`mailto:`), WhatsApp chat (`wa.me` deep link) — click-to-contact links only; delivery is never claimed without an integration.

### Module 8 — Campaign analytics

Metrics: page views, unique visitors, enquiries, leads by campaign/location, conversion rate, performance over time. `Conversion Rate = (Total Leads / Unique Visitors) × 100`. Date-range filters, charts + tables. Landing-page activity is clearly distinguished from advertising impressions/spend (not tracked in MVP).

### Module 9 — AI features

1. Ad content generator (headlines, descriptions, CTA suggestions).
2. Landing page content generator.
3. Campaign assistant (audience suggestions, improvements, weak-performance detection).
4. Lead qualification (interest categorization, transparent rule-based prioritization, follow-up questions).
5. Follow-up assistant (personalized messages, next actions).

**Implemented in Phase 7 as two honest layers.** Ad copy and landing-page copy
use a configured OpenAI-compatible provider (`AI_PROVIDER`, `AI_API_KEY`,
`AI_MODEL`, `AI_BASE_URL`); the adapter is explicit that nothing is generated
when the provider is missing (`503 ai_not_configured`) and prompts forbid
invented statistics, awards or guarantees. Campaign review, lead qualification
and follow-up drafts are deterministic rule-based functions over the business's
own campaign and lead data: every score point is listed, the UI labels them
"Rule-based", no outcome is predicted, and drafted messages are copied or opened
in the user's own phone/WhatsApp/email app — CampaignHub never sends them. All
features sit behind interfaces in `src/modules/ai/`; there is no fake AI.

## 5. Non-functional requirements

- **Security:** scrypt password hashing, JWT session auth, RBAC + tenant isolation, Zod server validation, parameterized queries (Prisma), XSS-safe React rendering, CSRF-safe cookie sessions (SameSite=Lax), rate limiting on public forms, upload validation (type/size), env-based secrets, audit logging.
- **Performance:** indexed hot queries, paginated tables, streaming server components where useful.
- **Reliability:** centralized error handling, structured logs, health endpoint.
- **Deployability:** Docker image → Google Cloud Run + Cloud SQL (Phase 8), local dev on plain Node + PostgreSQL.
- **Accessibility:** semantic HTML, labelled inputs, visible focus states, AA contrast (light theme).

## 6. Constraints & honest-implementation rules

1. No claims of ad-platform publishing (Google/Meta) until real integrations exist.
2. No fake AI outputs.
3. No sensitive credential collection in lead forms; consent + privacy notices present.
4. Click-to-contact only; no delivery claims for WhatsApp/email.
5. Demo content (e.g. homepage success stories) must be labelled as demo.
6. No static placeholder data inside production features (dashboards read live DB data; seed script provides realistic dev data).

## 7. Success metrics (platform KPIs, tracked later)

- Businesses registered / active (weekly)
- Campaigns created / published
- Landing-page views → enquiries conversion rate
- Lead → qualified → converted funnel rates
- Paid subscriptions by plan

## 8. Out of scope for MVP

Payments/billing execution (subscription state is modeled; payment gateway integration later), ad-platform integrations, email delivery provider, dark theme UI (tokens ready), native mobile apps, multi-language UI.

## 9. Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-11-11 | Auth.js v5 credentials + JWT sessions | Simple, provider-extensible, matches spec |
| 2026-11-11 | scrypt (Node crypto) for password hashing | No native build issues on Windows/containers; standard-compliant |
| 2026-11-11 | Email service interface + console transport | Real interface now, provider later; no fake delivery |
| 2026-11-11 | Local file storage adapter; GCS adapter for production | Matches spec storage strategy |
| 2026-11-11 | INR pricing, integer paise amounts | Target market; avoids float money bugs |
| 2026-11-11 | Light theme only; dark tokens defined | Agreed scope for MVP |
| 2026-11-11 | Classic dynamic rendering (no cacheComponents) | Per-tenant dynamic data everywhere; simpler, safer with Auth.js |
| 2026-11-11 | Next.js 16 conventions: `proxy.ts`, async request APIs | Current stable framework per spec |
