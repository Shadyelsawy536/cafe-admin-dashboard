import { PaymentProvider, CreatePaymentParams, CreatePaymentResult, WebhookVerifyResult } from "../payment-provider.ts";

const ENDPOINTS = { test: "https://test-api.kashier.io/v3/payment/sessions", live: "https://api.kashier.io/v3/payment/sessions" } as const;
async function hmacHex(keyText: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(keyText), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)))).map(b => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export class KashierProvider implements PaymentProvider {
  async createPayment(p: CreatePaymentParams): Promise<CreatePaymentResult> {
    const c = p.credentials;
    const env = String(c.environment || "").trim().toLowerCase();
    if (!c.merchant_id || !c.api_key || !c.secret_key || (env !== "test" && env !== "live")) throw new Error("Kashier credentials incomplete or invalid environment");
    if (p.currency.toUpperCase() !== "EGP") throw new Error("Kashier integration currently requires EGP");
    const orderRef = p.providerOrderReference || p.orderId;
    const res = await fetch(ENDPOINTS[env], { method: "POST", headers: { "Content-Type": "application/json", "Authorization": c.secret_key, "api-key": c.api_key }, body: JSON.stringify({
      expireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      maxFailureAttempts: 3,
      paymentType: "credit",
      amount: (p.amountCents / 100).toFixed(2),
      currency: p.currency.toUpperCase(),
      order: orderRef,
      merchantId: c.merchant_id,
      merchantRedirect: p.redirectionUrl,
      display: "en",
      type: "one-time",
      allowedMethods: "card,wallet",
      serverWebhook: p.notificationUrl,
      customer: { email: "guest@example.com", reference: orderRef },
      metaData: { internalOrderId: p.orderId, internalPaymentId: (orderRef.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1] || "") }
    }) });
    const rawText = await res.text();
    let data: any; try { data = JSON.parse(rawText); } catch { throw new Error("Kashier returned an invalid response"); }
    if (!res.ok) throw new Error("Kashier session creation failed (HTTP " + res.status + "): " + rawText.slice(0, 1000));
    if (typeof data.sessionUrl !== "string" || !data.sessionUrl.startsWith("https://")) throw new Error("Kashier response did not include a secure session URL");
    return { providerPaymentId: String(data._id || orderRef), checkoutUrl: data.sessionUrl, raw: { sessionId: data._id || null } };
  }
  extractOrderId(payload: unknown): string | null {
    const d = (payload as any)?.data;
    const internal = d?.metaData?.internalOrderId;
    if (typeof internal === "string" && internal.trim()) return internal.trim();
    const ref = String(d?.orderReference || "");
    const match = ref.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/i);
    return match?.[1] || null;
  }
  async verifyWebhook(payload: unknown, signatureParams: Record<string, string>, credentials: Record<string, string>): Promise<WebhookVerifyResult> {
    const body = payload as any; const d = body?.data; const signature = signatureParams["x-kashier-signature"];
    const keys = d?.signatureKeys;
    if (!d || !credentials.api_key || !signature || !Array.isArray(keys) || !keys.every((k: unknown) => typeof k === "string")) {
      return { valid: false, providerEventId: null, eventType: "invalid", providerPaymentId: null, status: "pending", raw: null };
    }
    const signed = [...keys].sort().map((k: string) => k + "=" + encodeURIComponent(d[k] == null ? "" : String(d[k]))).join("&");
    const valid = safeEqual((await hmacHex(credentials.api_key, signed)).toLowerCase(), signature.toLowerCase());
    const event = String(body.event || "payment").toLowerCase();
    const s = String(d.status || "").toUpperCase();
    const status: WebhookVerifyResult["status"] = event.includes("refund") ? "refunded" : s === "SUCCESS" ? "paid" : s === "FAILURE" ? "failed" : "pending";
    return { valid, providerEventId: String(d.transactionId || d.kashierOrderId || ""), eventType: event, providerPaymentId: String(d.kashierOrderId || d.transactionId || ""), status, raw: payload };
  }
}
