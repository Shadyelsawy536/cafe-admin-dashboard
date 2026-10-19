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
