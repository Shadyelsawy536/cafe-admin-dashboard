import { PaymentProvider, CreatePaymentParams, CreatePaymentResult, WebhookVerifyResult } from "../payment-provider.ts";
import { normalizePaymobWebhook } from "../provider-event-normalization.ts";

// Paymob Intention API + Unified Checkout. HMAC field order below is
// Paymob's own documented 20-field concatenation (developers.paymob.com),
// verified before writing this, not guessed.
export class PaymobProvider implements PaymentProvider {
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const { credentials } = params;

    const res = await fetch("https://accept.paymob.com/v1/intention/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${credentials.secret_key}`,
      },
      body: JSON.stringify({
        amount: params.amountCents,
        currency: params.currency,
        payment_methods: [Number(credentials.integration_id)],
        items: [],
        billing_data: {
          first_name: params.customerName || "Guest",
          last_name: "Customer",
          phone_number: params.customerPhone || "+00000000000",
          email: "guest@example.com",
          country: "EG",
          city: "NA",
          street: "NA",
          building: "NA",
          floor: "NA",
          apartment: "NA",
        },
        extras: { order_id: params.orderId },
        notification_url: params.notificationUrl,
        redirection_url: params.redirectionUrl,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Paymob intention creation failed: ${res.status} ${body}`);
    }

    const data = await res.json();
    const clientSecret = data.client_secret;
    const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${credentials.public_key}&clientSecret=${clientSecret}`;

    return { providerPaymentId: String(data.intention_order_id ?? data.id ?? ""), checkoutUrl, raw: data };
  }

  // Same payload shape payment-webhook used to parse inline before provider
  // dispatch moved to the URL (?provider=paymob) — moved here unchanged.
  extractOrderId(payload: any): string | null {
    const obj = payload?.obj ?? {};
    const orderId =
      obj?.payment_key_claims?.extra?.order_id ??
      obj?.extras?.order_id ??
      obj?.payment_key_claims?.order_id;
    return orderId ? String(orderId) : null;
  }

  async verifyWebhook(
    payload: any,
    params: Record<string, string>,
    credentials: Record<string, string>,
  ): Promise<WebhookVerifyResult> {
    const providedHmac = params.hmac;
    const obj = payload?.obj ?? payload;

    const fields = [
      obj.amount_cents, obj.created_at, obj.currency, obj.error_occured,
      obj.has_parent_transaction, obj.id, obj.integration_id, obj.is_3d_secure,
      obj.is_auth, obj.is_capture, obj.is_refunded, obj.is_standalone_payment,
      obj.is_voided, obj.order?.id, obj.owner, obj.pending,
      obj.source_data?.pan, obj.source_data?.sub_type, obj.source_data?.type, obj.success,
    ];
    const concatenated = fields.map((f) => String(f ?? "")).join("");

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(credentials.hmac_secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(concatenated));
    const computedHmac = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");

    const valid = computedHmac === providedHmac;

    const normalized = normalizePaymobWebhook(obj as Record<string, unknown>);
    return {
      valid,
      providerEventId: normalized.providerEventId,
      eventType: normalized.status,
      providerPaymentId: String(obj.order?.id ?? ""),
      status: normalized.status,
      raw: payload,
    };
  }
}
