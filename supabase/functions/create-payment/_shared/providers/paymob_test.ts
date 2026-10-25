import { assertEquals } from "jsr:@std/assert";
import { PaymobProvider } from "./paymob.ts";

Deno.test("Paymob provider stores the gateway Order ID used in transaction callbacks", async () => {
  const provider = new PaymobProvider();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    id: "pi_test_intention-id",
    intention_order_id: 217503754,
    client_secret: "test-client-secret",
  }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  })) as typeof fetch;

  try {
    const result = await provider.createPayment({
      orderId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      amountCents: 10000,
      currency: "EGP",
      customerName: "Test Customer",
      customerPhone: "01000000000",
      credentials: {
        secret_key: "test-secret",
        public_key: "test-public",
        integration_id: "123456",
        hmac_secret: "test-hmac",
      },
      notificationUrl: "https://example.supabase.co/functions/v1/payment-webhook",
      redirectionUrl: "https://shop.example.com/?order=test",
    });

    assertEquals(result.providerPaymentId, "217503754");
    assertEquals(result.checkoutUrl.includes("test-client-secret"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
