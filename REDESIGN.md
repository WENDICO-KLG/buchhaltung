# Wendico Buchhaltung – redesign "Private Bank"

UI language stays German (de-CH, CHF). Only UI/styling/layout changes.

## Hard rules (every agent)
- Do not modify lib/storage.ts, lib/company.ts, lib/supabase.ts, lib/utils.ts, lib/social-media.ts, lib/todo-priority.ts, lib/sales-training.ts, lib/calculator.ts, types/, supabase/, proxy.ts, next.config.ts, tests/*.test.mjs, package dependencies. No new npm dependencies. No API/auth/permission changes. All handlers, state, validation, labels, aria attributes and data calculations remain.
- NEVER connect to the real Supabase project: no .env with real values, no netlify env:get/pull, no `sb`. Run the app only against the mock (tests/visual/mock-supabase.mjs, branch redesign/qa). No invented numbers in the app: every figure derives from loaded data.
- No pushing, no deploying, no touching branch main or the checkout ~/Projects/buchhaltung. Work only in your own worktree and branch, commit there. Edit only the files you own.
- AGENTS.md: Next 16 differs from older versions; check node_modules/next/dist/docs. CSP: fonts via next/font (self-hosted), no external requests, no inline <script>; inline style attributes are allowed.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Gates: `npx tsc --noEmit`, `npm run lint` (no new problems vs. main), `npm run build` with dummy env NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=mock NEXT_PUBLIC_APP_URL=http://127.0.0.1:<port>. Use your own ports. Kill only processes you started (by PID). When committed, move your node_modules and .next to ~/.Trash under a unique name.

## Concept
A private bank at night. Near-black green-tinted ink, frosted glass plates lit from behind by two slow soft lights (emerald, warm gold), hairline gold edges. Signature motif: fine engraved guilloche rosette lines (banknote engraving, SVG) behind the hero figure and on login. Nothing else is decorated. Forbidden: purple/blue gradients, neon, gradient text on everything, emoji, coloured left-border cards, identical card grids, pill badges everywhere, uppercase tracked eyebrow on every section, generic marketing copy.
- Type: display/hero figures and h1 `Bodoni Moda` (lining numerals), all UI `Instrument Sans` with tabular-nums for money. Few sizes, strong contrast in scale; body ≥ 15px, labels ≥ 12px.
- Colour: gold = primary action, goal and active nav only. Emerald = money in / positive. Muted coral = negative/overdue. Everything else neutral. Dark is default; light theme (class `.light`) is warm ivory glass and must work equally well. WCAG AA text contrast in both.
- Depth: 3 glass levels only (plate, raised, overlay). Content on tables sits on a more opaque plate for legibility. backdrop-filter at most on shell, plates and overlays, never per table row; fallback colour without support.
- Motion: 160–420ms ease-out; number count-up once, ring draw, bars grow, hover lift 2px. All respect prefers-reduced-motion.
- Mobile first-class: 390px without horizontal page scroll, 44px targets, tables become readable rows, bottom tab bar (4 permitted main pages + Menü) with safe-area.

## Token / class contract (foundation owns; existing names keep working)
Existing variables keep their names: --ink --muted --line --paper --surface --surface-soft --primary --primary-hover --accent --danger. New: --gold --gold-soft --emerald --emerald-soft --coral --coral-soft --plate --raised --overlay --hairline --on-primary --chart-1..5 --chart-grid --ring-track.
Existing classes keep working: .panel .action .primary .field .filter .filter-active .icon-button .page-enter .card-lift etc. Primary button text is --on-primary.
New components in components/ui/:
- page-header.tsx `<PageHeader title subtitle? actions? />`
- stat.tsx `<Stat label value delta? deltaTone? hint? size="lg|md" />`
- progress.tsx `<ProgressRing value max label size? tone? />`, `<ProgressBar value max tone? label? />`
- count-up.tsx `<CountUp value format />` (final value is in the DOM for screen readers and reduced motion)
- status.tsx `<Status tone="neutral|info|gold|positive|negative">`
- empty-state.tsx `<EmptyState icon title text action? />`
- skeleton.tsx `<Skeleton />`
- guilloche.tsx `<Guilloche />` (aria-hidden)
- celebration.tsx `celebrate({ title, amount? })` + `<CelebrationHost/>` mounted in the shell: gold-leaf canvas burst plus a small toast "Deal gewonnen", 2.5 s, aria-live, no motion when reduced

## Ownership
- foundation (redesign/foundation): app/globals.css, app/layout.tsx, app/loading.tsx, app/error.tsx, app/not-found.tsx, components/ui/*, components/layout/workspace-shell.tsx, components/layout/notification-center.tsx
- qa (redesign/qa): tests/visual/*
- dashboard (redesign/dashboard): app/dashboard/*, components/dashboard/*
- sales (redesign/sales): app/prospects/** , components/prospects-section.tsx, app/customers/*
- finance (redesign/finance): app/analytics/*, app/cvs/*, app/social-media/*, app/calculator/*, components/calculator.tsx
- workspace (redesign/workspace): app/todos/*, app/profile/*, app/settings/*, app/login/*, app/auth/*, components/layout/company-team.tsx
If you need a CSS rule, put it in a CSS module or Tailwind classes in your own files; do not edit globals.css.
