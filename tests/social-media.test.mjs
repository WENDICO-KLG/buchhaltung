import { test } from "node:test";
import assert from "node:assert/strict";
import { socialMediaMonthSummary, validateSocialMediaOrder } from "../lib/social-media.ts";

const input = { title: "Instagram Reel", postUrl: "https://www.instagram.com/p/test/", serviceDate: "2026-10-19", amount: 125.50 };

test("social media totals separate service months and paid amounts without rounding drift", () => {
  const orders = [
    { ...input, id: "first", amount: 0.10, paidAt: null },
    { ...input, id: "second", amount: 0.20, paidAt: "2026-11-01T12:00:00Z" },
    { ...input, id: "next-month", serviceDate: "2026-11-01", amount: 500, paidAt: null },
    { ...input, id: "other-year", serviceDate: "2025-10-19", amount: 100, paidAt: null },
  ];
  assert.deepEqual(socialMediaMonthSummary(orders, "2026-10"), { count: 2, total: 0.30, paid: 0.20, open: 0.10 });
  assert.deepEqual(socialMediaMonthSummary(orders, "2026-12"), { count: 0, total: 0, paid: 0, open: 0 });
});

test("social media inputs require valid dates, safe links and finite cent amounts", () => {
  assert.doesNotThrow(() => validateSocialMediaOrder(input));
  assert.doesNotThrow(() => validateSocialMediaOrder({ ...input, amount: 0 }));
  for (const changes of [
    { title: " " }, { title: "x".repeat(201) }, { postUrl: "javascript:alert(1)" },
    { postUrl: "not-a-link" }, { serviceDate: "2026-02-30" }, { serviceDate: "2026-13-01" },
    { amount: -1 }, { amount: NaN }, { amount: Infinity }, { amount: 10.001 }, { amount: 10000000 },
  ]) assert.throws(() => validateSocialMediaOrder({ ...input, ...changes }));
});