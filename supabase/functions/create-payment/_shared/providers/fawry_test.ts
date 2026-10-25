import { assertEquals } from "jsr:@std/assert";
import { FawryProvider } from "./fawry.ts";

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function notification(status: string, secureKey: string, paymentReference = "") {
  const payload: Record<string, unknown> = {
    fawryRefNumber: "fawry-ref-123",
    merchantRefNumber: "1790000000123456",
    orderStatus: status,
    paymentMethod: "CARD",
    orderAmount: "125.50",
    paymentAmount: "125.50",
    paymentRefrenceNumber: paymentReference,
  };
  return sha256Hex(
    "fawry-ref-1231790000000123456125.50125.50" +
      status + "CARD" + paymentReference + secureKey,
  ).then((messageSignature) => ({ ...payload, messageSignature }));
}

Deno.test("Fawry hosted checkout sends required language and signs the exact attempt reference", async () => {
  const provider = new FawryProvider();
  const originalFetch = globalThis.fetch;
  const sentBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    sentBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ redirectUrl: "https://checkout.fawry.com/session/123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const result = await provider.createPayment({
      orderId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      providerOrderReference: "1790000000123456",
      amountCents: 12550,
      currency: "EGP",
      customerName: "Test Customer",
      customerPhone: "01000000000",
      credentials: {
        merchant_code: "merchant-test",
        secure_key: "secure-test",
        environment: "staging",
      },
      notificationUrl: "https://example.supabase.co/functions/v1/payment-webhook?provider=fawry",
      redirectionUrl: "https://shop.example.com/?order=test",
    });

    assertEquals(result.checkoutUrl, "https://checkout.fawry.com/session/123");
    const sent = sentBodies[0];
    assertEquals(sent.language, "ar-eg");
    assertEquals(sent.merchantRefNum, "1790000000123456");
    assertEquals((sent.chargeItems as Array<Record<string, unknown>>)[0].price, 125.5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Fawry accepts a correctly signed NEW notification and a later PAID event distinctly", async () => {
  const provider = new FawryProvider();
  const credentials = { secure_key: "secure-test" };
  const created = await notification("NEW", credentials.secure_key);
  const paid = await notification("PAID", credentials.secure_key, "payment-ref-1");

  const createdResult = await provider.verifyWebhook(created, {}, credentials);
  const paidResult = await provider.verifyWebhook(paid, {}, credentials);

  assertEquals(createdResult.valid, true);
  assertEquals(createdResult.status, "pending");
  assertEquals(paidResult.valid, true);
  assertEquals(paidResult.status, "paid");
  assertEquals(createdResult.providerEventId === paidResult.providerEventId, false);
});

Deno.test("Fawry rejects a notification if a signed amount is modified", async () => {
  const provider = new FawryProvider();
  const credentials = { secure_key: "secure-test" };
  const signed = await notification("PAID", credentials.secure_key, "payment-ref-1");
  const tampered = { ...signed, paymentAmount: "1.00" };
  const result = await provider.verifyWebhook(tampered, {}, credentials);
  assertEquals(result.valid, false);
});
