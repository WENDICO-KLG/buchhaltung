# Wendico Buchhaltung – redesign "Glass" (replaces "Private Bank")

Reference image, LOOK AT IT with Read before anything: /Users/panat.ruangsri/JARVIS/workspace/uploads/2026-11-24/c3a5fea7-IMG_4242.png
The owner wants this look reproduced exactly in feel. UI language stays German (de-CH, CHF). Only UI/styling/layout changes.

## Hard rules (every agent)
- You are a helper: do the work yourself, start no other agents.
- Everyone works in this ONE worktree, branch redesign/glass: /Users/panat.ruangsri/Projects/buchhaltung-wt/luxe. Others edit at the same time. Edit only files you own, commit only those (`git commit -m … -- <paths>`; retry if index.lock exists). Never stash, reset, checkout, switch, rebase or amend. Never touch ~/Projects/buchhaltung or any wendico-website folder.
- Never modify lib/, types/, supabase/, proxy.ts, next.config.ts, tests/*.test.mjs, package*.json. No new dependencies. No API/auth/permission changes. All handlers, state, validation, labels, aria attributes, data calculations and features remain.
- NEVER connect to the real Supabase project: no real .env, no netlify env, no `sb`. Only tests/visual/mock-supabase.mjs. No invented numbers in the app.
- No pushing, no deploying. Screenshots and scripts go outside the repo: ~/JARVIS/workspace/buchhaltung-design/. Playwright: ~/Projects/buchhaltung-wt/tools.
- Next 16 (AGENTS.md, node_modules/next/dist/docs). CSP: next/font only, no external requests, no inline <script>.
- Shared servers (do not kill): mock 127.0.0.1:54399, `next dev` http://127.0.0.1:3160 (hot reloads everyone's edits). Use `node tests/visual/shots.mjs <dir> --base http://127.0.0.1:3160 --routes … --parallel 1`. Do not run `npm run build` while others work (it would overwrite .next); use `npx tsc --noEmit` and eslint on your files.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## The look
- Ground: pure near-black (#050505, neutral, no green/blue tint). Behind everything, one fixed image of dark liquid-metal/smoked-glass ribbons sweeping diagonally (grey-black with soft white speculars), very low key, so glass has something to refract. Large parts stay black.
- Glass plate: very transparent dark fill (white 3–6 %), radius 26–28px, NO visible uniform border: a 1px edge that is bright white at the top-left and bottom-right corners and fades to almost nothing along the sides (masked gradient pseudo element), faint inner top glow, deep soft shadow. Tactile like a physical object. Small plates/tiles radius 22px.
- Type: Poppins (400/500/600). Small and precise: card title 15–16px/600 white, secondary 13px/400 grey, labels 12px min, body 14px. Page h1 about 24–28px/600. One figure per view may be large (40–56px, weight 500, tabular). No serif, no uppercase eyebrows, no gradient text. Form inputs 16px on phones.
- Contrast of the hierarchy: active = white, neighbours = dim grey (like the temperature scale 16° 18° 20° **22°** 24° 26°). Dim text still ≥ 4.5:1.
- Green (#4fe32f family) is the ONLY accent: active pill, toggle on, status dot, one key figure/positive state, progress. A soft glow (blurred green) only on the active nav pill, on toggles and on status dots. Income may be green; everything else white/grey. Coral (muted) only for errors/overdue, as text or a dot, never as large fills. No gold, purple, blue anywhere except the logo.
- Pills: tabs/filters sit inside one pill-shaped glass track; active one is a dark-green tinted pill with white text; others plain dim text. Horizontally scrollable on phones.
- Buttons: pill shaped. Primary = dark-green tinted glass, green inner glow, green icon, white label (like "Home" in the dock). Secondary = clear glass pill with specular edge. Icon buttons = perfect circles 40–44px with specular edge.
- Toggles: small glass capsule, knob on the right glowing green when on, grey when off.
- Fields: pill/rounded 16px dark glass, hairline, green focus ring. Tables: one plate, no zebra, hairline row dividers white 6 %, 13–14px, tabular numbers right aligned, round row actions; readable rows on phone.
- Structure: generous negative space, one clear focal card per page, uneven deliberate grids (not rows of identical icon cards), details revealed quietly. Forbidden: emoji, heavy colour gradients, coloured left borders, identical KPI icon cards, guilloche/banknote motif, marketing copy.
- Charts: white/grey bars or lines with green for the current/selected/income series; thin, no boxes; small round bar caps.
- Phone: header = avatar circle + "Hallo," / name, round bell with green dot and round grid button; floating pill dock at the bottom: active item is an expanded green-glow pill with label, others round icon buttons. No horizontal page scroll at 390px, 44px targets, safe areas.
- Desktop: the navigation is a detached floating glass rail (labels, collapsible to round icon buttons, existing behaviour kept), active item = green-glow pill. Header has no bar: avatar + greeting left, round icon buttons right.
- Logo: /wendico-logo-v2.png exactly as it is, original purple, NO CSS filter.
- Light theme (`.light`) stays available: same shapes, soft white/grey frosted glass, dark text, darker green for text. Dark is the default and priority.
- Motion 160–320ms ease-out, reduced-motion respected. WCAG AA. prefers-reduced-transparency fallback.
- Performance: backdrop-filter only on shell, focal plates and overlays, never per row. Do not let it trap fixed children/popovers.

## Contract
Existing CSS variables, class names and components/ui APIs keep working (--gold* become aliases of the green accent, --emerald positive, --coral negative). Class names from foundation: .panel/.plate .raised .overlay .tile (small plate) .pill-track + .filter/.filter-active, .action .primary .icon-button .header-icon-button .switch (checkbox; .commission-switch same) .field .chip .dot .dot-on .money .display (now Poppins). Page files should use these; need something special → CSS module in your own files. Remove legacy hex literals from files you own.

## Ownership
- foundation: app/globals.css, app/layout.tsx, loading/error/not-found, components/ui/*, components/layout/workspace-shell.tsx, notification-center.tsx, public/manifest.webmanifest colours, public/glass-ribbon*.webp
- dashboard: app/dashboard/*, components/dashboard/*
- finance: app/analytics/*, app/cvs/*, app/social-media/*, app/calculator/*, components/calculator.tsx
- sales: app/prospects/**, components/prospects-section.tsx, app/customers/*
- workspace: app/todos/*, app/profile/*, app/settings/*, app/login/*, app/auth/*, components/layout/company-team.tsx
- tester: tests/visual/*, and fixes anywhere once all builders are done
