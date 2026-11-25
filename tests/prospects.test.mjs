import { test } from "node:test";
import assert from "node:assert/strict";
import { loadAllPages } from "../lib/pagination.ts";
import { hasMessage, prospectMatcher, prospectSearchText } from "../lib/prospect-search.ts";

const table = (length) => Array.from({ length }, (_, index) => ({ id: `p-${index}` }));
const server = (rows, cap = 1000, calls = []) => async (from, to, withTotal) => { calls.push(from); return { rows: rows.slice(from, Math.min(to + 1, from + cap)), total: withTotal ? rows.length : null }; };

test("every row is read exactly once, in order", async () => {
  for (const length of [0, 1, 999, 1000, 1001, 2000, 6071]) {
    const calls = [];
    assert.deepEqual(await loadAllPages(server(table(length), 1000, calls)), table(length));
    assert.equal(calls.length, Math.max(1, Math.ceil(length / 1000)));
  }
});

test("a lower server cap loses nothing", async () => assert.equal((await loadAllPages(server(table(1234), 500))).length, 1234));

test("rows moving between pages are re-read and never doubled", async () => {
  let rows = table(2000), calls = 0;
  const result = await loadAllPages(async (from, to, withTotal) => {
    const page = await server(rows)(from, to, withTotal);
    if ((calls += 1) === 1) rows = [{ id: "inserted" }, ...rows];
    return page;
  });
  assert.equal(result.length, 2001);
  assert.equal(new Set(result.map((row) => row.id)).size, 2001);
});

test("errors are passed on", async () => { await assert.rejects(loadAllPages(async () => { throw new Error("nope"); }), /nope/); });

test("search covers name, company, e-mail, phone and message", () => {
  const text = prospectSearchText({ companyName: "Käserei Muster", contactName: "Änni Beispiel", email: "info@kaese.example", phone: "+41 79 000 11 22", message: "Bitte\nim März melden" });
  for (const query of ["", "  ", "käserei", "ÄNNI", "kaese.example", "079 000 11 22", "+41790001122", "0041 79 000", "märz melden", "muster beispiel"]) assert.ok(prospectMatcher(query)(text), query);
  for (const query of ["april", "muster april", "muster 0001122", "078 000 11 22"]) assert.ok(!prospectMatcher(query)(text), query);
});

test("missing or blank messages do not count", () => {
  for (const message of [undefined, null, "", " \n "]) assert.equal(hasMessage({ message }), false);
  assert.equal(hasMessage({ message: "Ja" }), true);
});
