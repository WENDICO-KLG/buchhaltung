import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedPushEndpoint } from "../supabase/functions/_shared/push-security.ts";
import { readAgentBody } from "../lib/agent-security.ts";

test("push destinations reject arbitrary servers and URL tricks", () => {
  for (const endpoint of [
    "https://fcm.googleapis.com/fcm/send/token",
    "https://updates.push.services.mozilla.com/wpush/v2/token",
    "https://web.push.apple.com/token",
  ]) assert.equal(isAllowedPushEndpoint(endpoint), true, endpoint);
  for (const endpoint of [
    "https://127.0.0.1/push", "https://localhost/push", "https://attacker.test/push",
    "https://fcm.googleapis.com.attacker.test/fcm/send/token",
    "https://fcm.googleapis.com@attacker.test/fcm/send/token",
    "https://user:password@fcm.googleapis.com/fcm/send/token",
    "https://fcm.googleapis.com:8443/fcm/send/token",
    "http://fcm.googleapis.com/fcm/send/token",
    "https://fcm.googleapis.com/other", "https://fcm.googleapis.com/fcm/send/token?redirect=x",
    "https://fcm.googleapis.com/fcm/send/token#fragment", "not-a-url", null,
  ]) assert.equal(isAllowedPushEndpoint(endpoint), false, String(endpoint));
});

test("agent body validation bounds bytes and rejects malformed fields", async () => {
  const request = (body) => new Request("https://example.test/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.deepEqual(await readAgentBody(request({ message: " Frage " })), { message: "Frage", companyId: undefined });
  for (const body of [null, [], { message: 5 }, { message: "" }, { message: "x".repeat(4001) }, { message: "Frage", companyId: "invalid" }]) await assert.rejects(readAgentBody(request(body)));
  await assert.rejects(readAgentBody(request({ message: "Frage", padding: "x".repeat(20000) })), /body_too_large/);
});