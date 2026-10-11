import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateExpression, commissionBreakdown } from "../lib/calculator.ts";

test("calculator supports pasted numbers and rejects programmatic expressions", () => {
  assert.equal(calculateExpression("1'000,50 + 10% * 100"), 1010.5);
  assert.equal(calculateExpression("sqrt(81) + 2^3"), 17);
  assert.equal(calculateExpression("5!"), 120);
  for (const input of ["a=5", "import(1)", "[1,2]", "1/0", "sqrt(-1)"]) assert.throws(() => calculateExpression(input));
});
test("monthly bonus applies to all closes and respects month and employee boundaries", () => {
  const rows = [1, 2, 3].map((day) => ({ customer_id: String(day), member_id: "anna", amount: 1000, payment_date: `2026-10-0${day}` }));
  rows.push({ customer_id: "4", member_id: "anna", amount: 1000, payment_date: "2026-11-01" }, { customer_id: "5", member_id: "bob", amount: 1000, payment_date: "2026-10-01" });
  assert.equal(commissionBreakdown(rows, "2026-10-01", "2026-10-31", "anna").reduce((sum,row)=>sum+row.total,0),450);
  assert.equal(commissionBreakdown(rows, "2026-10-01", "2026-10-01", "anna")[0].total,150);
  assert.equal(commissionBreakdown(rows, "2026-11-01", "2026-11-30", "anna")[0].total,100);
  assert.equal(commissionBreakdown(rows, "2026-10-01", "2026-10-31", "bob")[0].total,100);
});