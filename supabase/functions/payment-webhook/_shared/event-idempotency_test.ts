import { assertEquals } from "jsr:@std/assert";
import { isDuplicateProcessedEvent } from "./event-idempotency.ts";

Deno.test("missing event is not treated as a duplicate", () => {
  assertEquals(isDuplicateProcessedEvent(null), false);
});

Deno.test("unprocessed event remains retryable", () => {
  assertEquals(isDuplicateProcessedEvent({ processed: false, event_type: "paid" }), false);
});

Deno.test("legacy created event can be upgraded by a verified webhook", () => {
  assertEquals(isDuplicateProcessedEvent({ processed: true, event_type: "created" }), false);
});

Deno.test("already processed provider event is acknowledged as duplicate", () => {
  assertEquals(isDuplicateProcessedEvent({ processed: true, event_type: "paid" }), true);
});

import { normalizeKashierEventId, normalizePaymobWebhook } from "./provider-event-normalization.ts";

Deno.test("Paymob pending notification stays pending and has stable retry identity", () => {
  const pending = normalizePaymobWebhook({ id: 123, success: false, pending: true });
  assertEquals(pending.status, "pending");
  assertEquals(pending.providerEventId, "123:pending");
  assertEquals(normalizePaymobWebhook({ id: 123, success: false, pending: true }).providerEventId, pending.providerEventId);
});

Deno.test("Paymob refund is not deduplicated as the original transaction event", () => {
  const paid = normalizePaymobWebhook({ id: 456, success: true, pending: false });
  const refunded = normalizePaymobWebhook({ id: 456, success: false, pending: false, is_refunded: true });
  assertEquals(paid.status, "paid");
  assertEquals(refunded.status, "refunded");
  assertEquals(paid.providerEventId === refunded.providerEventId, false);
});

Deno.test("Kashier refund/status transitions receive distinct event identities", () => {
  const paid = normalizeKashierEventId("txn-123", "payment", "SUCCESS");
  const refunded = normalizeKashierEventId("txn-123", "refund", "SUCCESS");
  const failed = normalizeKashierEventId("txn-123", "payment", "FAILURE");
  assertEquals(paid === refunded, false);
  assertEquals(paid === failed, false);
  assertEquals(normalizeKashierEventId("", "payment", "SUCCESS"), null);
});
