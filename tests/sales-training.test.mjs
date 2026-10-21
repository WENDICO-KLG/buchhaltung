import { test } from "node:test";
import assert from "node:assert/strict";
import { callSteps, isObjectionCategory, objectionCategories, objections, parseTrainingProgress, searchObjections, shuffle, toggleCategory, trainingDeck, trainingPool } from "../lib/sales-training.ts";

test("every objection has a unique id, a known category and complete texts", () => {
  assert.equal(new Set(objections.map((item) => item.id)).size, objections.length);
  for (const item of objections) {
    assert.ok(objectionCategories.includes(item.category), item.id);
    for (const text of [item.objection, item.answer, item.tip]) assert.ok(text.trim(), item.id);
  }
  for (const category of objectionCategories) assert.ok(objections.some((item) => item.category === category), category);
  assert.ok(callSteps.every((step) => step.lines.length > 0));
});

test("training rounds contain each selected card once and never repeat the last card first", () => {
  const pool = trainingPool(objections, ["money"], {}, false);
  assert.ok(pool.length > 1 && pool.every((item) => item.category === "money"));
  const previousId = shuffle(pool.map((item) => item.id), () => 0)[0];
  const deck = trainingDeck(pool, previousId, () => 0);
  assert.deepEqual([...deck].sort(), pool.map((item) => item.id).sort());
  assert.notEqual(deck[0], previousId);
  assert.deepEqual(trainingDeck(pool.slice(0, 1), pool[0].id), [pool[0].id]);
  assert.deepEqual(trainingDeck([]), []);
});

test("only open cards skip mastered objections but keep the ones to practice", () => {
  const [first, second] = objections;
  const pool = trainingPool(objections, [], { [first.id]: "mastered", [second.id]: "practice" }, true);
  assert.equal(pool.length, objections.length - 1);
  assert.ok(!pool.includes(first) && pool.includes(second));
});

test("selecting every category falls back to all", () => {
  let selection = [];
  for (const category of objectionCategories) selection = toggleCategory(selection, category);
  assert.deepEqual(selection, []);
  assert.deepEqual(toggleCategory([], "time"), ["time"]);
  assert.deepEqual(toggleCategory(["time"], "time"), []);
  assert.equal(isObjectionCategory("money"), true);
  for (const value of ["geld", "", null, "__proto__"]) assert.equal(isObjectionCategory(value), false);
});

test("stored progress ignores unknown ids, unknown ratings and broken JSON", () => {
  const [first, second] = objections;
  assert.deepEqual(parseTrainingProgress(JSON.stringify({ [first.id]: "mastered", [second.id]: "maybe", unknown: "mastered" })), { [first.id]: "mastered" });
  for (const raw of [null, "", "not json", "[]", "null", "42"]) assert.deepEqual(parseTrainingProgress(raw), {});
});

test("search finds objections by any word, ignoring case and umlauts", () => {
  assert.ok(searchObjections(objections, "TEUER").some((item) => item.id === "too-expensive"));
  assert.ok(searchObjections(objections, "ruckruf").some((item) => item.id === "not-decider"));
  assert.ok(searchObjections(objections, "keine zeit").some((item) => item.id === "no-time"));
  assert.equal(searchObjections(objections, "   ").length, objections.length);
  assert.deepEqual(searchObjections(objections, "kein-treffer-moeglich"), []);
});
