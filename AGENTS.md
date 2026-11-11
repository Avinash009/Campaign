<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CampaignHub — Agent Instructions

CampaignHub is a multi-tenant SaaS for advertising & lead generation. Businesses create campaigns, publish promotional landing pages, collect enquiries, and manage leads. Read `docs/PRD.md` and `docs/IMPLEMENTATION_PLAN.md` before making changes. Keep the plan updated as you work.

## Stack

- **Framework:** Next.js (App Router, TypeScript strict, Turbopack) — this project uses **Next.js 16**: `proxy.ts` replaces `middleware.ts`, request APIs (`cookies`, `headers`, `params`, `searchParams`) are async-only, linting runs through the ESLint CLI.
- **UI:** Tailwind CSS v4, shadcn/ui (Radix base, Nova preset), Lucide icons, Recharts, Sonner toasts.
- **Backend:** Next.js Route Handlers + Server Actions, modular service layer, Zod validation.
- **Database:** PostgreSQL + Prisma ORM (`prisma/`), migrations committed in `prisma/migrations/`.
- **Auth:** Auth.js v5 (`next-auth@beta`) with credentials provider, JWT sessions, RBAC.
- **Testing:** Vitest (unit/integration), Playwright (e2e, added in Phase 8).

## Commands

```bash
npm run dev            # development server (Turbopack)
npm run build          # production build
npm run start          # run production build
npm run lint           # ESLint CLI
npm run typecheck      # tsc --noEmit
npm run test           # Vitest (unit + integration)
npm run test:watch     # Vitest watch mode
npm run db:migrate:dev # apply migrations locally (creates them from schema changes)
npm run db:migrate     # apply committed migrations (deploy)
npm run db:seed        # seed industries, plans, admin + demo data
npm run db:studio      # Prisma Studio
```

## Architecture rules

1. **Modular monolith.** All domain logic lives in `src/modules/<module>/` with a consistent layout:
   - `schemas.ts` — Zod schemas (the single source of truth for input shapes)
   - `repository.ts` — Prisma queries only; no business logic
   - `service.ts` — business logic, authorization checks, orchestration
   - `types.ts` — shared module types (optional)
2. **Routing layer stays thin.** Pages and route handlers call services; they never query Prisma directly.
3. **Multi-tenancy is mandatory.** Every business-owned record carries `businessId`. Every repository query for tenant data MUST filter by `businessId` obtained from the authenticated session (except platform-admin operations that explicitly need cross-tenant access). Cross-tenant access is a critical security bug.
4. **Never trust client input.** Validate with Zod on the server for every route handler / Server Action.
5. **Honesty over simulation.** Never fake integrations: no fake AI, no "sent" emails unless a provider confirms delivery, no pretending campaigns publish to Google/Meta Ads. Adapters throw explicit "not configured" errors when a backend is missing.
6. **Extensibility.** New industries are data (rows in `Industry`) plus optional template components; never hardcode industry lists in business logic. AI features go behind service interfaces in `src/modules/ai/`.
7. **Classic dynamic rendering.** This project intentionally does not use `cacheComponents`. Request-time data access is the norm for dashboard pages. Do not enable it without a plan in `docs/ARCHITECTURE.md`.

## Coding conventions

- TypeScript strict; no `any`, no non-null assertions where avoidable.
- Server Components by default; `"use client"` only for interactivity.
- Import alias `@/` → `src/`.
- Components: `PascalCase.tsx`; helpers: `camelCase.ts`.
- Errors: throw `ApiError` (from `src/lib/errors.ts`) in services; route handlers wrap logic in `routeHandler()` which maps errors to a consistent JSON envelope.
- Logging: `src/lib/logger.ts` structured JSON logger — never `console.log` in app code.
- IDs: UUID strings from Prisma. Money: integer minor units (paise) — never floats.
- Time: store UTC (`DateTime`); render in IST/UTC as decided per UI spec.
- All user-visible strings: sentence case, clear Indian-English-friendly copy (platform currency is INR).

## Testing requirements

- Unit tests for pure logic (validation schemas, slug utils, rate limiting, password hashing) live next to the code as `*.test.ts`.
- API integration tests for route handlers live in `tests/api/` (spin up against a test database, `DATABASE_URL` from env).
- Run `npm run lint && npm run typecheck && npm run test` after every phase; fix errors before moving on.
- E2E (Playwright) arrives in Phase 8 — see `docs/TESTING.md`.

## Documentation

- Update `docs/IMPLEMENTATION_PLAN.md` checkboxes and `docs/CHANGELOG.md` whenever a task completes or a decision changes.
- Schema/API/design changes must update `docs/DATABASE.md`, `docs/API.md`, `docs/UI_DESIGN.md` respectively.

## Security checklist (every feature)

- [ ] Zod validation server-side
- [ ] `businessId` scoping on every tenant query
- [ ] Role check (`OWNER` / `ADMIN` / `MEMBER` / platform admin) for the action
- [ ] Rate limit public endpoints (`src/lib/rate-limit.ts`)
- [ ] No secrets in client code — only `NEXT_PUBLIC_*` prefixed values
- [ ] Audit log for significant operations (`AuditLog` via `src/modules/audit/`)
- [ ] Consent + privacy notices on public lead forms
