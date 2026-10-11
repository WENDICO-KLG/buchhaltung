import { test } from "node:test";
import assert from "node:assert/strict";
import { compareTodoPriority } from "../lib/todo-priority.ts";

test("todos sort overdue first, then priority and due date", () => {
  const task = (id, priority, dueDate) => ({ id, priority, dueDate, status: "not_started", createdAt: "2026-10-01" });
  const rows = [task("low", "low", "2026-10-12"), task("high-later", "high", "2026-10-20"), task("overdue", "low", "2026-10-01"), task("high-sooner", "high", "2026-10-12"), task("normal", "normal")];
  assert.deepEqual(rows.sort((left,right) => compareTodoPriority(left,right,"2026-10-11")).map(row=>row.id), ["overdue","high-sooner","high-later","normal","low"]);
});