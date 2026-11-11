# CampaignHub — UI Design System

**Version:** 0.1.0 · Light theme first (dark tokens defined, untested) · Responsive: desktop / tablet / mobile

## 1. Brand

- **Name:** CampaignHub
- **Wordmark:** Megaphone icon (Lucide) in indigo + "CampaignHub" in semibold Geist Sans.
- **Voice:** clear, confident, benefit-first marketing copy; plain operational copy in the app. Indian-English friendly (₹ pricing).
- **Logo badge:** indigo-600 rounded square + white megaphone.

## 2. Color tokens (CSS variables in `src/app/globals.css`)

| Token | Value (light) | Usage |
|---|---|---|
| `--primary` | indigo-600 | buttons, links, active nav, focus |
| `--primary-foreground` | white | on primary |
| `--secondary` / `--muted` | slate-100 | secondary surfaces, table headers |
| `--muted-foreground` | slate-500 | secondary text |
| `--accent` | indigo-50 | hover states, highlights |
| `--accent-foreground` | indigo-700 | text on accent |
| `--background` / `--foreground` | white / slate-900 | page |
| `--border` / `--input` | slate-200 | borders, inputs |
| `--ring` | indigo-500 | focus rings |
| `--destructive` | red-600 | errors, destructive actions |
| charts 1–5 | indigo / sky / emerald / amber / rose | Recharts series |

Dark theme: slate-950 background, indigo-400 primary — defined in `.dark` block, not shipped in MVP.

Rules: no gradients as decoration (flat surfaces + borders); indigo is the only brand color; status colors come from badges (see §5); icon-only indigo accents.

## 3. Typography & spacing

- **Font:** Geist Sans (`--font-sans`), Geist Mono for numbers/IDs. System fallback.
- Scale: page title 28–36px semibold; section title 24px; card title 16–18px; body 14–16px; meta 13–14px muted.
- Spacing: Tailwind 4 grid; section padding `py-16 md:py-24`; card padding `p-6`; content max-width `max-w-6xl` (marketing `max-w-7xl`).
- Radius: `--radius: 0.625rem` (shadcn scale sm→4xl).
- Elevation: borders + subtle `shadow-sm`; no heavy drop shadows.

## 4. Layouts

| Route group | Layout | Components |
|---|---|---|
| `(marketing)` | top nav (sticky, blur, white) + footer | `SiteHeader`, `SiteFooter` |
| `(dashboard)` | fixed sidebar (desktop) + topbar + content | `DashboardSidebar`, `DashboardTopbar` |
| `(admin)` | sidebar variant, indigo-tinted | Phase 6 |
| `/c/[slug]` | standalone landing page, no app chrome | Phase 3 templates |

- **Sidebar:** logo, primary nav (Dashboard, Campaigns, Leads, Analytics, Team, Settings) with Lucide icons; business name + plan badge in header block; collapsible to `Sheet` under `lg` breakpoint; active item = indigo-50 bg + indigo-700 text.
- **Topbar:** page context, search (Phase 4), notification bell (Phase 2+), user dropdown (name, email, sign out).
- **Marketing header:** logo, nav links (Features, Industries, Pricing, About, Contact), "Login" ghost + "Start Free" primary buttons.

## 5. Components (shadcn/ui, Radix)

`button card input label textarea select badge table tabs dialog dropdown-menu sheet skeleton avatar separator form breadcrumb popover tooltip switch alert accordion pagination sonner`

Conventions:

- **Badges for status:** Campaign — Draft (slate), Active (emerald), Paused (amber), Completed (sky), Archived (slate). Lead — New (indigo), Contacted (sky), Interested (violet), Qualified (amber), Converted (emerald), Lost (red). Use `badge-variant` mapping helper (Phase 3/4).
- **Tables:** sticky header, muted row hover, pagination footer ("Page x of y", rows count), empty state with icon + action CTA.
- **Forms:** label above input, helper text below, inline field errors, disabled submit while pending, toast on success/failure (sonner).
- **Charts:** Recharts, `--chart-1..5` palette, minimal grid, value tooltips, legends only when >1 series.
- **Toasts:** success (default), destructive for errors; never duplicate on retries.

## 6. Page templates

- **Marketing home:** hero (headline, sub-copy, "Start Free" + "Explore Features" CTAs, product-illustration panel) → logos strip → 3-step "How it works" → industries grid (8, icon + name) → features grid (6) → success stories (labelled **demo content**) → pricing (3 plans from DB) → FAQ accordion → CTA band → footer.
- **Auth:** centered card, logo, title, form, footer link (login ↔ register). Phase 2.
- **Dashboard home:** 6 stat cards (2–3 per row, responsive) → charts row → recent activity lists. Phase 2/5.
- **List pages (campaigns/leads):** toolbar (search, filters, primary action) → table → pagination.
- **Detail pages:** header (title, status badge, actions) → info cards grid → timeline/activity column.

## 7. States

- **Loading:** skeletons matching final layout (card/table skeletons); buttons show spinner + disable.
- **Empty:** icon + one-line explanation + primary action ("Create your first campaign").
- **Error:** alert card with retry; forms show inline errors; toast for action failures.
- **404/500:** branded pages with home link.

## 8. Responsive behavior

- Breakpoints: sm 640 / md 768 / lg 1024. Dashboard sidebar → Sheet below lg; stat cards 1-col (base) / 2 (sm) / 3 (lg); tables horizontally scrollable on mobile with sticky first column; marketing hero stacks below lg.

## 9. Accessibility

- Semantic landmarks (`header nav main footer`), labelled form controls, `aria-current` on active nav, visible focus rings (`--ring`), AA contrast on light theme, keyboard-operable dialogs/menus (Radix), icon-only buttons have `sr-only` labels.
