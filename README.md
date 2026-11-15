# CampaignHub

Multi-tenant SaaS for advertising & lead generation. Businesses create
promotional campaigns, publish landing pages at public URLs, collect
customer enquiries as structured leads, and manage them to closure.

> **Honest scope (MVP):** CampaignHub creates promotional landing pages and
> manages the enquiries they generate. It does **not** place ads on Google or
> Meta, does not fake AI features, and does not send email without a real
> provider — see `docs/PRD.md` §6.

## Stack

- Next.js 16 (App Router, TypeScript strict, Turbopack) · `proxy.ts` replaces `middleware.ts`
- Tailwind CSS v4 + shadcn/ui (Radix, Nova preset) + Lucide + Recharts
- PostgreSQL 14+ with Prisma ORM (migrations in `prisma/migrations/`)
- Auth.js v5 (credentials provider, JWT sessions, scrypt password hashing)
- Zod validation everywhere server-side · Vitest unit tests
- Modular monolith: all domain logic in `src/modules/<module>/`

## Project setup

```bash
npm install                 # dependencies
cp .env.example .env        # then fill in DATABASE_URL + AUTH_SECRET
npm run db:migrate:dev      # apply migrations to your local PostgreSQL
npm run db:seed             # industries, plans, admin + demo business data
npm run dev                 # http://localhost:3000
```

Required env vars (see `.env.example` for all):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js session secret (`openssl rand -base64 32`) |

Optional: AI content generation is disabled by default (`AI_PROVIDER="none"`).
Set `AI_PROVIDER="openai"` and `AI_API_KEY` (optionally `AI_MODEL`,
`AI_BASE_URL`, `AI_TIMEOUT_MS`) to enable ad-copy and landing-copy generation.
The rule-based campaign review, lead qualification and follow-up drafts work
without a provider for generation.

### Seeded accounts (development only)

The seed script is idempotent and creates fictional demo data
("Sri Green Realty"). Passwords come from `.env`
(`ADMIN_*`, `DEMO_*`) or are generated randomly and logged once.

| Account | Email (default) | Role |
|---|---|---|
| Platform admin | `admin@campaignhub.test` | `/admin` |
| Demo owner | `owner@srigeenrealty.test` | `/dashboard` (OWNER) |
| Demo member | `member@srigeenrealty.test` | `/dashboard` (MEMBER) |

Sign-in UI ships in Phase 2 (see `docs/IMPLEMENTATION_PLAN.md`).

## Commands

```bash
npm run dev            # development server
npm run build          # production build
npm run start          # run production build
npm run lint           # ESLint CLI
npm run typecheck      # tsc --noEmit
npm run test           # Vitest (unit tests)
npm run test:watch     # Vitest watch mode
npm run db:migrate:dev # create/apply migrations locally
npm run db:migrate     # apply committed migrations (deploy)
npm run db:seed        # seed script
npm run db:studio      # Prisma Studio
npm run db:generate    # regenerate Prisma client
```

## Documentation

| Document | Contents |
|---|---|
| `docs/PRD.md` | Product requirements, roles, modules, constraints |
| `docs/ARCHITECTURE.md` | System design, layering, tenancy, rendering strategy |
| `docs/DATABASE.md` | Schema design, ER diagram, indexes, seed data |
| `docs/API.md` | REST API conventions + endpoint catalog |
| `docs/UI_DESIGN.md` | Design system, tokens, page templates |
| `docs/IMPLEMENTATION_PLAN.md` | Phase-by-phase task tracker |
| `docs/TESTING.md` | Test strategy per module |
| `docs/CHANGELOG.md` | Notable changes |

Agent/contributor rules live in `AGENTS.md` — read them before changing code.

## Roadmap

1. ✅ Phase 1 — foundation (schema, auth plumbing, shells, marketing site)
2. ✅ Phase 2 — registration, login, onboarding, team invites
3. ✅ Phase 3 — campaigns + industry landing pages (`/c/{slug}`)
4. ✅ Phase 4 — lead pipeline, follow-ups, CSV export
5. ✅ Phase 5 — analytics (views, visitors, conversion)
6. ✅ Phase 6 — platform administration
7. ✅ Phase 7 — AI features (behind real integrations)
8. Phase 8 — Docker, Cloud Run deployment, e2e tests
