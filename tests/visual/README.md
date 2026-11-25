# Visual QA

Runs the app against a local, in-memory imitation of Supabase and photographs every route. No real project, no real data, no extra dependency in `package.json`.

## 1. Mock

```sh
node tests/visual/mock-supabase.mjs [port] [--mode owner] [--log]   # default 54399, 127.0.0.1 only
```

Covers the auth, REST, RPC and storage calls made by `lib/` and the pages, including page permissions and the cascades. Fixtures (`fixtures.mjs`, with 1,250 generated Instantly prospects) are fictional and dated relative to today. Writes live in memory; `curl -X POST http://127.0.0.1:54399/__mock/reset` restores the fixtures (also needed after midnight). Simplifications: filters are limited to `eq neq lt lte gt gte is in like`, `not.` and a flat `or`; a select returns at most 1000 rows (`offset`/`limit` or `Range`), database constraints are not checked, signed URLs do not expire, signing up sends nothing.

The account decides the mode, so all modes work at once. Sign in by e-mail with any password of 8 or more characters (`falsch123` shows the error):

| Mode | Account | What it shows |
| --- | --- | --- |
| `owner` | owner@demo.example | everything, two companies |
| `admin` | admin@demo.example | administrator |
| `limited` | limited@demo.example | employee: To-Dos, Social Media, Rechner only |
| `viewer` | viewer@demo.example | read-only, five pages |
| `empty` | empty@demo.example | owner of a company without data |
| `nocompany` | nocompany@demo.example | no company, one open invitation |

## 2. App

Production build (what the baseline used). Use your own port. The variables are needed at build **and** start time.

```sh
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=mock NEXT_PUBLIC_APP_URL=http://127.0.0.1:3150
npm run build && npx next start -H 127.0.0.1 -p 3150
```

`next build` and `next dev` may rewrite `next-env.d.ts`; do not commit that.

## 3. Screenshots

Needs a `playwright` package matching the browsers in `~/Library/Caches/ms-playwright` (1.65.1 for chromium-1255), outside the repo: `~/Projects/buchhaltung-wt/tools/node_modules/playwright`, or set `PLAYWRIGHT_DIR` to the folder that contains `node_modules`.

```sh
node tests/visual/shots.mjs <output-dir> --base http://127.0.0.1:3150
```

Options: `--mock URL`, `--mode viewer`, `--routes dashboard,login`, `--themes dark,light`, `--viewports desktop,mobile`, `--parallel 3`, `--motion` (default is reduced motion), `--strict` (exit 1 on any finding; otherwise only on a crash).

It seeds a fake session and writes `<route>.<viewport>.<theme>.png` (1440x900 and 390x844, full page) plus `report.json` with console errors, page errors, failed requests, redirects, horizontal overflow with the elements causing it, and blocked external requests. Both URLs must be loopback; every other request is aborted, and the Google Sheet iframe is replaced by a placeholder. `login`, `auth-callback-error` and `not-found` sit outside the shell, so the original app does not apply the light theme there. A page wider than 390 px produces a wider PNG: that is the overflow finding. In `limited`, `viewer` and `nocompany`, "redirected to" is the expected result for pages without access.

The shell sidebar of the original app is `position: fixed`, so in full-page pictures taller than the viewport it ends at 900 px. That is an artefact of the capture, not a bug.
