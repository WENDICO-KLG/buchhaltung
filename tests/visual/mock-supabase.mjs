// Dependency-free stand-in for the Supabase endpoints this app uses. Loopback only, in memory.
import http from "node:http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ALL_PAGES, createFixtures } from "./fixtures.mjs";

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const modeOfEmail = (email) => Object.keys(ACCOUNTS).find((mode) => ACCOUNTS[mode].email === email);

export function fakeUser(mode) {
  const account = ACCOUNTS[mode];
  if (!account) throw new Error(`Unknown mode "${mode}". Use: ${Object.keys(ACCOUNTS).join(", ")}`);
  const at = "2024-01-01T00:00:00.000Z";
  return { id: account.id, aud: "authenticated", role: "authenticated", email: account.email, email_confirmed_at: at, confirmed_at: at, last_sign_in_at: at, app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: account.name }, identities: [], created_at: at, updated_at: at };
}
export function fakeSession(mode) {
  const user = fakeUser(mode);
  const expires_in = 30 * 24 * 3600;
  const expires_at = Math.floor(Date.now() / 1000) + expires_in;
  const access_token = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", exp: expires_at, session_id: "mock" })}.mock`;
  return { access_token, token_type: "bearer", expires_in, expires_at, refresh_token: `mock-${mode}`, user };
}

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new ApiError(status, code, message); };
const raise = (message) => fail(400, "P0001", message);
const denied = (table) => fail(403, "42501", `new row violates row-level security policy for table "${table}"`);

// Table -> page that grants access (mirrors supabase/migrations/20261011160000 and 20261019100000).
const PAGE = { invoices: "dashboard", expenses: "analytics", documents: "cvs", customers: "customers", prospects: "prospects", todos: "todos", todo_comments: "todos", monthly_goals: "dashboard", company_profiles: "profile", workspace_items: "removed_workspace", workspace_files: "removed_workspace", social_media_orders: "social-media" };
const BUCKET_PAGE = { documents: "cvs", "customer-logos": "customers" };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const DEFAULTS = {
  customers: () => ({ logo_path: null, commission_enabled: false }),
  todo_comments: () => ({ created_at: new Date().toISOString() }),
  social_media_orders: () => ({ id: randomUUID(), paid_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  documents: () => ({ created_at: today() }),
};

export function createMockServer({ mode: defaultMode = "owner", log = false } = {}) {
  fakeUser(defaultMode);
  let db = createFixtures();
  let files = new Map();

  const memberOf = (user, company) => db.members.find((m) => m.user_id === user.id && m.company_id === company);
  const isManager = (member) => Boolean(member) && ["owner", "admin"].includes(member.role);
  const hasPage = (member, page) => isManager(member) || Boolean(member?.allowed_pages.includes(page));
  const canRead = (user, table, row) => {
    if (table === "push_subscriptions") return row.user_id === user.id;
    const member = memberOf(user, row.user_id);
    return hasPage(member, PAGE[table]) || (["customers", "expenses"].includes(table) && hasPage(member, "dashboard"));
  };
  const canWrite = (user, table, row) => {
    if (table === "push_subscriptions") return row.user_id === user.id;
    const member = memberOf(user, row.user_id);
    if (table === "company_profiles" && !isManager(member)) return false;
    return Boolean(member) && member.role !== "viewer" && hasPage(member, PAGE[table]);
  };
  const manages = (user, company) => { const member = memberOf(user, company); if (!isManager(member)) raise("Keine Berechtigung."); return member; };
  const companyName = (id) => db.companies.find((c) => c.id === id)?.name;
  const invitationView = (i) => ({ ...i, company_name: companyName(i.company_id) });

  function guard(user, table, next, previous) {
    const manager = isManager(memberOf(user, (next ?? previous).user_id));
    if (table === "customers" && next) {
      if (next.commission_enabled !== (previous?.commission_enabled ?? false) && !manager) raise("Nur Administratoren verwalten die Provisionsfreigabe.");
      if (!next.commission_enabled) db.commissions = db.commissions.filter((c) => c.customer_id !== next.id);
    }
    if (table === "social_media_orders") {
      if (!manager && (previous?.paid_at || (next && (next.paid_at ?? null) !== (previous?.paid_at ?? null)))) raise("Nur Administratoren duerfen Zahlungen und bezahlte Auftraege aendern.");
      if (next) next.updated_at = new Date().toISOString();
    }
  }

  const rpc = {
    my_companies: (user) => db.members.filter((m) => m.user_id === user.id).map((m) => ({ company_id: m.company_id, company_name: companyName(m.company_id), role: m.role, allowed_pages: m.allowed_pages })),
    my_company_invitations: (user) => db.invitations.filter((i) => i.email === user.email).map(invitationView),
    company_pending_invitations: (user, { company }) => { manages(user, company); return db.invitations.filter((i) => i.company_id === company).map(invitationView); },
    company_team: (user, { company }) => {
      if (!memberOf(user, company)) raise("Kein Zugriff auf diese Firma.");
      return db.members.filter((m) => m.company_id === company).map(({ company_id, ...member }) => { void company_id; return member; });
    },
    create_company: (user, { company_name }) => {
      const id = randomUUID();
      db.companies.push({ id, name: company_name });
      db.members.push({ company_id: id, user_id: user.id, email: user.email, display_name: null, role: "owner", allowed_pages: [...ALL_PAGES] });
      return id;
    },
    invite_company_member: (user, { company, invited_email, invited_role }) => {
      const actor = manages(user, company);
      if (invited_role === "admin" && actor.role !== "owner") raise("Nur Inhaber laden Administratoren ein.");
      const id = randomUUID();
      db.invitations = db.invitations.filter((i) => !(i.company_id === company && i.email === invited_email));
      db.invitations.push({ id, company_id: company, email: invited_email, role: invited_role, expires_at: new Date(Date.now() + 7 * 864e5).toISOString() });
      return id;
    },
    accept_company_invitation: (user, { invitation }) => {
      const invite = db.invitations.find((i) => i.id === invitation && i.email === user.email) ?? raise("Einladung ungueltig.");
      db.members.push({ company_id: invite.company_id, user_id: user.id, email: user.email, display_name: null, role: invite.role, allowed_pages: ALL_PAGES.filter((p) => p !== "social-media") });
      db.invitations = db.invitations.filter((i) => i !== invite);
      return invite.company_id;
    },
    revoke_company_invitation: (user, { invitation }) => { const invite = db.invitations.find((i) => i.id === invitation) ?? raise("Einladung ungueltig."); manages(user, invite.company_id); db.invitations = db.invitations.filter((i) => i !== invite); return null; },
    set_company_member_role: (user, { company, member, new_role }) => { const actor = manages(user, company); const target = memberOf({ id: member }, company) ?? raise("Mitglied nicht gefunden."); if (target.role === "owner" || (actor.role !== "owner" && (target.role === "admin" || new_role === "admin"))) raise("Keine Berechtigung."); target.role = new_role; return null; },
    set_company_member_name: (user, { company, member, member_name }) => { manages(user, company); const target = memberOf({ id: member }, company) ?? raise("Mitglied nicht gefunden."); target.display_name = member_name.trim() || null; return null; },
    remove_company_member: (user, { company, member }) => { const actor = manages(user, company); const target = memberOf({ id: member }, company) ?? raise("Mitglied nicht gefunden."); if (target.role === "owner" || (actor.role !== "owner" && target.role === "admin")) raise("Keine Berechtigung."); db.members = db.members.filter((m) => m !== target); return null; },
    set_member_pages: (user, { company, member, pages }) => { manages(user, company); const target = memberOf({ id: member }, company) ?? raise("Mitglied nicht gefunden."); if (!["member", "viewer"].includes(target.role)) raise("Nur Mitarbeiter und Leser haben konfigurierbare Seiten."); target.allowed_pages = pages; return null; },
    commission_customers: (user, { company }) => {
      const actor = memberOf(user, company);
      if (!hasPage(actor, "calculator")) raise("Kein Zugriff auf den Rechner.");
      return db.tables.customers.filter((c) => c.user_id === company && c.commission_enabled).map((c) => {
        const entry = db.commissions.find((x) => x.customer_id === c.id);
        const person = entry?.member_id ? memberOf({ id: entry.member_id }, company) : undefined;
        return { customer_id: c.id, company_name: c.company_name, amount: c.one_time_revenue, payment_date: c.one_time_revenue_date, member_id: entry?.member_id ?? null, member_name: person ? person.display_name ?? person.email : null, rate: entry?.rate ?? 0 };
      }).filter((row) => isManager(actor) || row.member_id === user.id).sort((a, b) => a.company_name.localeCompare(b.company_name));
    },
    set_customer_commission: (user, { company, customer, member, percentage }) => {
      manages(user, company);
      if (!db.tables.customers.some((c) => c.id === customer && c.user_id === company && c.commission_enabled)) raise("Der Kunde ist nicht fuer Provision aktiviert.");
      db.commissions = db.commissions.filter((c) => c.customer_id !== customer);
      db.commissions.push({ customer_id: customer, company_id: company, member_id: member, rate: percentage });
      return null;
    },
    dashboard_commissions: (user, { company }) => {
      if (!hasPage(memberOf(user, company), "dashboard")) raise("Kein Zugriff auf die Uebersicht.");
      const round = (value) => Math.round(value * 100) / 100;
      const eligible = db.tables.customers.filter((c) => c.user_id === company && c.commission_enabled && c.one_time_revenue_date && Number(c.one_time_revenue) > 0)
        .map((c) => ({ paid: c.one_time_revenue_date, amount: Number(c.one_time_revenue), member: db.commissions.find((x) => x.customer_id === c.id)?.member_id })).filter((c) => c.member);
      const totals = new Map();
      for (const row of eligible) {
        const closes = eligible.filter((x) => x.member === row.member && x.paid.slice(0, 7) === row.paid.slice(0, 7)).length;
        const base = round(row.amount * 0.1);
        totals.set(row.paid, round((totals.get(row.paid) ?? 0) + base + (closes >= 3 ? round(base * 0.5) : 0)));
      }
      return [...totals].sort().map(([payment_date, total]) => ({ payment_date, total }));
    },
  };

  // ---- PostgREST subset -------------------------------------------------
  const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
  const OPS = {
    eq: (a, b) => String(a) === b, neq: (a, b) => String(a) !== b,
    lt: (a, b) => a != null && String(a) < b, lte: (a, b) => a != null && String(a) <= b, gt: (a, b) => a != null && String(a) > b, gte: (a, b) => a != null && String(a) >= b,
    is: (a, b) => (b === "null" ? a == null : String(a) === b),
    in: (a, b) => b.replace(/^\(|\)$/g, "").split(",").map((v) => v.replace(/^"|"$/g, "")).includes(String(a)),
  };
  function matcher(params) {
    const tests = [];
    for (const [column, expression] of params) {
      if (RESERVED.has(column)) continue;
      const dot = expression.indexOf(".");
      const op = OPS[expression.slice(0, dot)] ?? fail(400, "PGRST100", `Mock: unsupported filter ${column}=${expression}`);
      tests.push((row) => op(row[column], expression.slice(dot + 1)));
    }
    return (row) => tests.every((test) => test(row));
  }
  function sorter(order) {
    const keys = order.split(",").map((part) => { const [column, ...flags] = part.split("."); const desc = flags.includes("desc"); return { column, sign: desc ? -1 : 1, nullsFirst: flags.includes("nullsfirst") || (desc && !flags.includes("nullslast")) }; });
    return (a, b) => {
      for (const { column, sign, nullsFirst } of keys) {
        const x = a[column], y = b[column];
        if (x == null && y == null) continue;
        if (x == null || y == null) return (x == null) === nullsFirst ? -1 : 1;
        const result = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "de");
        if (result) return result * sign;
      }
      return 0;
    };
  }
  const project = (row, select) => (!select || select === "*" ? row : Object.fromEntries(select.split(",").map((c) => [c, row[c] ?? null])));

  function rest(req, user, table, params, body) {
    if (!Object.hasOwn(db.tables, table)) fail(404, "PGRST205", `Could not find the table 'public.${table}' in the schema cache`);
    const rows = db.tables[table];
    const prefer = String(req.headers.prefer ?? "");
    const single = String(req.headers.accept ?? "").includes("vnd.pgrst.object");
    const respond = (result, status) => {
      const list = result.map((row) => project(row, params.get("select")));
      if (single && list.length !== 1) fail(406, "PGRST116", "JSON object requested, multiple (or no) rows returned");
      return { status, body: single ? list[0] : list };
    };
    const visible = () => rows.filter((row) => canRead(user, table, row)).filter(matcher(params));
    const written = (result, status) => (prefer.includes("return=representation") ? respond(result, status) : { status: status === 201 ? 201 : 204 });

    if (req.method === "GET" || req.method === "HEAD") {
      let result = visible();
      if (params.get("order")) result = [...result].sort(sorter(params.get("order")));
      const offset = Number(params.get("offset") ?? 0);
      const total = result.length;
      result = result.slice(offset, params.has("limit") ? offset + Number(params.get("limit")) : undefined);
      return { ...respond(result, 200), headers: { "Content-Range": `${result.length ? `${offset}-${offset + result.length - 1}` : "*"}/${prefer.includes("count=") ? total : "*"}` } };
    }
    if (req.method === "POST") {
      const merge = prefer.includes("resolution=merge-duplicates");
      const conflict = (params.get("on_conflict") ?? "id").split(",");
      const result = [];
      for (const input of Array.isArray(body) ? body : [body]) {
        const existing = rows.find((row) => conflict.every((c) => row[c] != null && row[c] === input[c]));
        const next = existing && merge ? { ...existing, ...input } : { ...(DEFAULTS[table]?.() ?? {}), ...input };
        if (!canWrite(user, table, next) || (existing && !canWrite(user, table, existing))) denied(table);
        if (existing && !merge) fail(409, "23505", "duplicate key value violates unique constraint");
        guard(user, table, next, existing);
        if (existing) rows[rows.indexOf(existing)] = next; else rows.push(next);
        result.push(next);
      }
      return written(result, 201);
    }
    if (req.method === "PATCH") {
      const result = visible().filter((row) => canWrite(user, table, row)).map((row) => {
        const next = { ...row, ...body };
        if (!canWrite(user, table, next)) denied(table);
        guard(user, table, next, row);
        rows[rows.indexOf(row)] = next;
        return next;
      });
      return written(result, 200);
    }
    if (req.method === "DELETE") {
      const result = visible().filter((row) => canWrite(user, table, row));
      for (const row of result) guard(user, table, undefined, row);
      db.tables[table] = rows.filter((row) => !result.includes(row));
      const gone = new Set(result.map((row) => row.id));
      // Same cascades as the schema.
      if (table === "todos") db.tables.todo_comments = db.tables.todo_comments.filter((c) => !gone.has(c.todo_id));
      if (table === "customers") { db.commissions = db.commissions.filter((c) => !gone.has(c.customer_id)); for (const t of [...db.tables.todos, ...db.tables.expenses]) if (gone.has(t.customer_id)) t.customer_id = null; }
      if (table === "prospects") for (const t of db.tables.todos) if (gone.has(t.prospect_id)) t.prospect_id = null;
      return written(result, 200);
    }
    return fail(405, "405", "Method not allowed");
  }

  // ---- Auth, storage ----------------------------------------------------
  const loopback = (value) => { try { return ["127.0.0.1", "localhost"].includes(new URL(value).hostname); } catch { return false; } };
  function auth(req, path, url, body) {
    if (path === "token") {
      const grant = url.searchParams.get("grant_type");
      if (grant === "refresh_token") { const mode = String(body?.refresh_token ?? "").replace(/^mock-/, ""); return ACCOUNTS[mode] ? { body: fakeSession(mode) } : fail(400, "refresh_token_not_found", "Invalid Refresh Token"); }
      if (grant === "password" && body?.password === "falsch123") fail(400, "invalid_credentials", "Invalid login credentials");
      return { body: fakeSession(modeOfEmail(body?.email) ?? defaultMode) };
    }
    if (path === "authorize") {
      const target = url.searchParams.get("redirect_to");
      if (!loopback(target)) fail(400, "bad_redirect", "Mock: loopback redirects only");
      const s = fakeSession(defaultMode);
      return { status: 302, headers: { Location: `${target}#${new URLSearchParams({ access_token: s.access_token, refresh_token: s.refresh_token, expires_in: String(s.expires_in), expires_at: String(s.expires_at), token_type: "bearer" })}` } };
    }
    if (path === "signup") return { body: { ...fakeUser("nocompany"), email: body?.email, email_confirmed_at: null, confirmation_sent_at: new Date().toISOString() } };
    if (path === "verify") return { body: fakeSession(defaultMode) };
    if (path === "recover" || path === "otp" || path === "resend") return { body: {} };
    if (path === "logout") return { status: 204 };
    if (path === "user") return { body: requireUser(req) };
    if (path === "settings" || path === "health") return { body: { external: { google: true }, disable_signup: false } };
    return fail(404, "not_found", `Mock: unknown auth path ${path}`);
  }
  function requireUser(req) {
    const token = String(req.headers.authorization ?? "").replace(/^Bearer /i, "");
    try { return fakeUser(modeOfEmail(JSON.parse(Buffer.from(token.split(".")[1], "base64url")).email)); }
    catch { return fail(401, "PGRST301", "JWT missing or invalid"); }
  }
  function uploadedFile(raw, type) {
    const boundary = /boundary=("?)([^";]+)\1/.exec(type)?.[2];
    if (!boundary) return { data: raw, type };
    const mark = Buffer.from(`--${boundary}`);
    for (let at = raw.indexOf(mark); at >= 0; at = raw.indexOf(mark, at + 1)) {
      const head = raw.indexOf("\r\n\r\n", at), next = raw.indexOf(mark, at + mark.length);
      if (head < 0 || next < 0 || head > next) break;
      const headers = raw.subarray(at, head).toString();
      if (/filename=/i.test(headers)) return { data: raw.subarray(head + 4, next - 2), type: /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1] ?? "application/octet-stream" };
    }
    return { data: Buffer.alloc(0), type: "application/octet-stream" };
  }
  const logo = (path) => {
    const n = [...path].reduce((sum, c) => sum + c.charCodeAt(0), 0);
    return { type: "image/svg+xml", data: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="16" fill="hsl(${150 + (n * 7) % 60} 25% 28%)"/><circle cx="48" cy="48" r="26" fill="none" stroke="#e8dcc0" stroke-width="4"/><text x="48" y="55" text-anchor="middle" font-family="serif" font-size="20" fill="#e8dcc0">DEMO</text></svg>`) };
  };
  function storage(req, path, raw) {
    const parse = () => { try { return JSON.parse(raw.toString() || "{}"); } catch { return fail(400, "bad_json", "Invalid JSON"); } };
    const parts = path.split("/").map(decodeURIComponent);
    if (parts[0] !== "object") fail(404, "404", "Mock: unknown storage path");
    const signed = parts[1] === "sign";
    const [bucket, ...rest] = parts.slice(signed ? 2 : 1);
    const name = rest.join("/"), key = `${bucket}/${name}`;
    if (signed && req.method === "GET") { const file = files.get(key) ?? logo(key); return { raw: file.data, headers: { "Content-Type": file.type } }; }
    const user = requireUser(req);
    const allow = (objectName, write) => {
      const member = memberOf(user, objectName.split("/")[0]);
      if (!hasPage(member, BUCKET_PAGE[bucket] ?? "removed_workspace") || (write && member.role === "viewer")) fail(403, "AccessDenied", "new row violates row-level security policy");
    };
    if (signed) {
      // Page access to logos is granted with "customers"; viewing the dashboard alone yields no logo, as in production.
      allow(name, false);
      return { body: { signedURL: `/object/sign/${parts.slice(2).map(encodeURIComponent).join("/")}?token=mock` } };
    }
    if (req.method === "DELETE") { const names = parse().prefixes ?? []; for (const n of names) { allow(n, true); files.delete(`${bucket}/${n}`); } return { body: names.map((n) => ({ name: n })) }; }
    if (req.method === "POST" || req.method === "PUT") { allow(name, true); files.set(key, uploadedFile(raw, String(req.headers["content-type"] ?? ""))); return { body: { Id: randomUUID(), Key: key } }; }
    if (req.method === "GET") { allow(name, false); const file = files.get(key) ?? logo(key); return { raw: file.data, headers: { "Content-Type": file.type } }; }
    return fail(405, "405", "Method not allowed");
  }

  function handle(req, url, raw) {
    const path = url.pathname;
    const json = () => { if (!raw.length) return undefined; try { return JSON.parse(raw.toString()); } catch { return fail(400, "PGRST102", "Invalid JSON"); } };
    if (path === "/__mock/health") return { body: { mock: "wendico-supabase", defaultMode } };
    if (path === "/__mock/reset" && req.method === "POST") { db = createFixtures(); files = new Map(); return { status: 204 }; }
    if (path.startsWith("/auth/v1/")) return auth(req, path.slice(9), url, json());
    if (path.startsWith("/storage/v1/")) return storage(req, path.slice(12), raw);
    if (path.startsWith("/rest/v1/rpc/")) {
      const name = path.slice(13), user = requireUser(req);
      if (!Object.hasOwn(rpc, name)) fail(404, "PGRST202", `Could not find the function public.${name} in the schema cache`);
      return { body: rpc[name](user, json() ?? {}) };
    }
    if (path.startsWith("/rest/v1/")) return rest(req, requireUser(req), path.slice(9), url.searchParams, json());
    return fail(404, "404", `Mock: unknown path ${path}`);
  }

  return http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const url = new URL(req.url, "http://127.0.0.1");
      const cors = { "Access-Control-Allow-Origin": req.headers.origin ?? "*", Vary: "Origin", "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": req.headers["access-control-request-headers"] ?? "*", "Access-Control-Expose-Headers": "Content-Range", "Access-Control-Allow-Private-Network": "true", "Access-Control-Max-Age": "600", "Cross-Origin-Resource-Policy": "cross-origin", "Cache-Control": "no-store" };
      let result;
      try { result = req.method === "OPTIONS" ? { status: 204 } : handle(req, url, Buffer.concat(chunks)); }
      catch (error) {
        if (!(error instanceof ApiError)) console.error(error);
        const status = error.status ?? 500;
        result = { status, body: { code: error.code ?? "500", error_code: error.code, message: error.message, msg: error.message, details: null, hint: null } };
      }
      const status = result.status ?? 200;
      if (log) console.log(`${req.method} ${url.pathname} ${status}`);
      const payload = result.raw ?? (status === 204 || status === 302 || result.body === undefined ? undefined : JSON.stringify(result.body));
      res.writeHead(status, { ...cors, ...(payload !== undefined && { "Content-Type": "application/json; charset=utf-8" }), ...result.headers });
      res.end(req.method === "HEAD" ? undefined : payload);
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const option = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args[i + 1]; };
  const port = Number(option("port") ?? (/^\d+$/.test(args[0] ?? "") ? args[0] : 54399));
  const mode = option("mode") ?? "owner";
  createMockServer({ mode, log: args.includes("--log") }).listen(port, "127.0.0.1", () => console.log(`Mock Supabase (mode ${mode}): http://127.0.0.1:${port}  pid ${process.pid}`));
}
