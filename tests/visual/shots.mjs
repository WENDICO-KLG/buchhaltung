// Full-page screenshots of every route against the mock. See README.md.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fakeSession } from "./mock-supabase.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; };
const base = new URL(option("base", "http://127.0.0.1:3100")).origin;
const mock = new URL(option("mock", "http://127.0.0.1:54399")).origin;
const out = option("out", args[0]?.startsWith("--") ? undefined : args[0]);
const mode = option("mode", "owner");
const only = option("routes")?.split(",");
const themes = option("themes", "dark,light").split(",");
const viewports = Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } }).filter(([name]) => option("viewports", "desktop,mobile").split(",").includes(name));
if (!out) { console.error("Usage: node shots.mjs <output-dir> [--base URL] [--mock URL] [--mode owner] [--routes dashboard,login] [--themes dark,light] [--viewports desktop,mobile] [--motion] [--strict]"); process.exit(2); }

const isLocal = (url) => { const u = new URL(url); return ["127.0.0.1", "localhost"].includes(u.hostname) || ["data:", "blob:", "about:"].includes(u.protocol); };
for (const url of [base, mock]) if (!isLocal(url)) { console.error(`Refusing non-loopback URL ${url}`); process.exit(2); }

function loadPlaywright() {
  const roots = [process.env.PLAYWRIGHT_DIR, join(homedir(), "Projects/buchhaltung-wt/tools")].filter(Boolean);
  for (const root of roots) {
    if (existsSync(join(root, "node_modules/playwright"))) return createRequire(join(resolve(root), "x.cjs"))("playwright");
  }
  console.error("Playwright not found. Set PLAYWRIGHT_DIR to a folder outside the repo that contains node_modules/playwright.");
  process.exit(2);
}

// path: URL, expect: final pathname if it differs, auth: whether the session is seeded
const ROUTES = [
  { name: "dashboard", path: "/dashboard" }, { name: "todos", path: "/todos" }, { name: "customers", path: "/customers" }, { name: "analytics", path: "/analytics" },
  { name: "calculator", path: "/calculator" }, { name: "social-media", path: "/social-media" }, { name: "prospects", path: "/prospects" },
  { name: "prospects-training", path: "/prospects/training" }, { name: "prospects-script", path: "/prospects/script" }, { name: "prospects-sheet", path: "/prospects/sheet" },
  { name: "cvs", path: "/cvs" }, { name: "profile", path: "/profile" }, { name: "settings", path: "/settings" },
  { name: "login", path: "/login", auth: false }, { name: "auth-callback-error", path: "/auth/callback?error=access_denied", auth: false },
  { name: "not-found", path: "/gibt-es-nicht", expectStatus: 404 },
].filter((route) => !only || only.includes(route.name));
if (!ROUTES.length) { console.error("No matching routes."); process.exit(2); }

const health = await fetch(`${mock}/__mock/health`).then((r) => r.json()).catch(() => undefined);
if (health?.mock !== "wendico-supabase") { console.error(`No mock at ${mock}. Start: node tests/visual/mock-supabase.mjs`); process.exit(2); }

const { chromium } = loadPlaywright();
const dir = resolve(out);
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const session = fakeSession(mode);
const storageKey = `sb-${new URL(mock).hostname.split(".")[0]}-auth-token`;
const report = [];

async function shoot(route, viewportName, viewport, theme) {
  const context = await browser.newContext({ viewport, locale: "de-CH", timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone, colorScheme: theme, reducedMotion: flag("motion") ? "no-preference" : "reduce", serviceWorkers: "block", isMobile: viewportName === "mobile", hasTouch: viewportName === "mobile" });
  const entry = { route: route.name, viewport: viewportName, theme, console: [], pageErrors: [], failed: [], blocked: [], overflow: null, problems: [] };
  await context.addInitScript(({ key, value, theme: selected }) => {
    // Runs in iframes too; storage is only touched on the app itself.
    if (window !== window.top) return;
    localStorage.setItem("wendico-books.theme", selected);
    if (value) localStorage.setItem(key, value);
    // Training shuffles its deck: a fixed seed keeps the pictures comparable. crypto.randomUUID is untouched.
    let seed = 42;
    Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  }, { key: storageKey, value: route.auth === false ? null : JSON.stringify(session), theme });
  // Nothing leaves the machine: every non-loopback request is stubbed (the sheet iframe) or aborted.
  await context.route((url) => !isLocal(url.href), (handler) => {
    const request = handler.request(), url = new URL(request.url());
    if (url.hostname === "docs.google.com" && request.resourceType() === "document") return handler.fulfill({ contentType: "text/html", body: "<!doctype html><body style='font:16px sans-serif;display:grid;place-items:center;height:90vh;color:#555'>Google Sheet (Platzhalter)</body>" });
    entry.blocked.push(url.origin + url.pathname);
    return handler.abort();
  });
  const page = await context.newPage();
  const expectedNoise = (text) => text.includes("Service Worker registration blocked by Playwright") || (route.expectStatus && text.includes(`status of ${route.expectStatus}`));
  page.on("console", (message) => { if (!expectedNoise(message.text()) && ["error", "warning"].includes(message.type())) entry.console.push(`${message.type()}: ${message.text().slice(0, 400)}`); });
  page.on("pageerror", (error) => entry.pageErrors.push(String(error).slice(0, 400)));
  page.on("response", (response) => { if (response.status() >= 400 && !(route.expectStatus === response.status() && new URL(response.url()).pathname === route.path)) entry.failed.push(`${response.status()} ${response.request().method()} ${response.url().slice(0, 200)}`); });
  page.on("requestfailed", (request) => { const why = request.failure()?.errorText; if (isLocal(request.url()) && why !== "net::ERR_ABORTED") entry.failed.push(`${why} ${request.url().slice(0, 200)}`); });
  try {
    const response = await page.goto(base + route.path, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const status = response?.status();
    if (status !== (route.expectStatus ?? 200)) entry.problems.push(`HTTP ${status}`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => entry.problems.push("network not idle after 15s"));
    await page.waitForFunction(() => document.body.innerText.trim() && !/(wird|werden) geladen/.test(document.body.innerText), null, { timeout: 15_000 }).catch(() => entry.problems.push("still shows a loading text after 15s"));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800); // chart and entrance animations
    // Scroll through once so that in-view effects and lazy images are resolved.
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise((done) => setTimeout(done, 60)); } scrollTo(0, 0); });
    await page.waitForTimeout(150);
    entry.finalPath = new URL(page.url()).pathname;
    const expected = new URL(base + route.path).pathname;
    if (entry.finalPath !== expected) entry.problems.push(`redirected to ${entry.finalPath}`);
    // isMobile grows the layout viewport to fit wide content, so compare with the configured width.
    entry.overflow = await page.evaluate((width) => {
      const root = document.documentElement;
      const scrollWidth = Math.max(root.scrollWidth, document.body.scrollWidth);
      if (scrollWidth <= width + 1) return null;
      const contained = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const style = getComputedStyle(p); if (style.overflowX !== "visible" && (getComputedStyle(el).position !== "absolute" || style.position !== "static")) return true; } return false; };
      const offenders = [...document.body.querySelectorAll("*")].filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.right > width + 1 && !contained(el); })
        .slice(-6).map((el) => `${el.tagName.toLowerCase()}.${String(el.getAttribute("class") ?? "").slice(0, 80)} right=${Math.round(el.getBoundingClientRect().right)}`);
      return { scrollWidth, width, offenders };
    }, viewport.width);
    entry.file = `${route.name}.${viewportName}.${theme}.png`;
    await page.screenshot({ path: join(dir, entry.file), fullPage: true, animations: "disabled" });
  } catch (error) { entry.problems.push(`FAILED ${String(error).slice(0, 300)}`); entry.crashed = true; }
  await context.close();
  if (entry.crashed) delete entry.file;
  report.push(entry);
  const bad = [...entry.problems, ...entry.pageErrors, ...entry.console, ...entry.failed, ...entry.blocked.map((b) => `blocked ${b}`), ...(entry.overflow ? [`overflow ${entry.overflow.scrollWidth}px > ${entry.overflow.width}px`] : [])];
  console.log(`${bad.length ? "!!" : "ok"} ${route.name} ${viewportName} ${theme}${bad.map((b) => `\n     ${b}`).join("")}`);
}

const jobs = ROUTES.flatMap((route) => viewports.flatMap(([name, viewport]) => themes.map((theme) => [route, name, viewport, theme])));
const total = jobs.length;
await Promise.all(Array.from({ length: Number(option("parallel", "3")) }, async () => { for (let job; (job = jobs.shift());) await shoot(...job); }));
await browser.close();
report.sort((a, b) => `${a.route}${a.viewport}${a.theme}`.localeCompare(`${b.route}${b.viewport}${b.theme}`));
const count = (test) => report.filter(test).length;
const summary = { shots: count((r) => r.file), of: total, crashed: count((r) => r.crashed), withProblems: count((r) => r.problems.length), withConsoleErrors: count((r) => r.pageErrors.length || r.console.some((c) => c.startsWith("error"))), withFailedRequests: count((r) => r.failed.length), withBlockedExternalRequests: count((r) => r.blocked.length), withOverflow: count((r) => r.overflow) };
writeFileSync(join(dir, "report.json"), JSON.stringify({ base, mock, mode, createdAt: new Date().toISOString(), summary, report }, null, 2));
console.log(summary, `\n${join(dir, "report.json")}`);
const findings = Object.entries(summary).some(([key, value]) => key.startsWith("with") && value);
process.exit(summary.crashed || (flag("strict") && findings) ? 1 : 0);
