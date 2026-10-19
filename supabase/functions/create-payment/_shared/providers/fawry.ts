import { PaymentProvider, CreatePaymentParams, CreatePaymentResult, WebhookVerifyResult } from "../payment-provider.ts";

// FawryPay Express Checkout Link (hosted checkout — customer is redirected
// to Fawry's page, same shape as Paymob's unified checkout). Field names,
// endpoints and both signature formulas below were taken from Fawry's own
// docs before writing this, not guessed:
//   charge:       developer.fawrystaging.com/docs/express-checkout/fawrypay-hosted-checkout
//   notification: developer.fawrystaging.com/docs/express-checkout/payment-notifications/server-notification-v2
// Credentials: only merchant_code + secure_key (one secret signs both
// directions — unlike Paymob's four-field split) + an explicit environment.

const ENDPOINTS = {
  staging: "https://atfawry.fawrystaging.com/fawrypay-api/api/payments/init",
  production: "https://atfawry.com/fawrypay-api/api/payments/init",
} as const;

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Fawry signs amounts as decimals with exactly two digits.
function twoDp(value: unknown): string {
  return Number(value ?? 0).toFixed(2);
}

// Constant-time so a wrong signature can't be narrowed down by response timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export class FawryProvider implements PaymentProvider {
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const { credentials } = params;
    const merchantCode = credentials.merchant_code;
    const secureKey = credentials.secure_key;
    if (!merchantCode || !secureKey) {
      throw new Error("Fawry credentials incomplete: merchant_code and secure_key are required.");
    }

    // Strict on purpose: "prod" or a stray space silently falling back to
    // staging would mean a restaurant believes it's live while no real
    // money ever moves.
    const environment = (credentials.environment ?? "").trim().toLowerCase();
    if (environment !== "staging" && environment !== "production") {
      throw new Error('Fawry environment must be exactly "staging" or "production".');
    }

    if (params.currency.toUpperCase() !== "EGP") {
      throw new Error(`Fawry only supports EGP, got ${params.currency}.`);
    }

    // Use the unique per-attempt reference recorded in payments.provider_order_reference.
    // This lets the webhook map Fawry's callback to the exact payment attempt,
    // even if the customer retries checkout for the same internal order.
    const merchantRefNum = params.providerOrderReference || params.orderId;
    const amount = twoDp(params.amountCents / 100);

    // One aggregate line equal to the order total (tax/delivery already
    // included upstream), so what Fawry charges always equals orders.total.
    const chargeItems = [
      { itemId: params.orderId, description: "Order", price: Number(amount), quantity: 1 },
    ];

    // Charge signature: merchantCode + merchantRefNum + customerProfileId
    // ("" when not sent) + returnUrl + per item (itemId + quantity +
    // price to 2dp) + secureKey -> SHA-256 hex.
    const itemsPart = chargeItems.map((i) => `${i.itemId}${i.quantity}${twoDp(i.price)}`).join("");
    const signature = await sha256Hex(
      `${merchantCode}${merchantRefNum}${""}${params.redirectionUrl}${itemsPart}${secureKey}`,
    );

    const res = await fetch(ENDPOINTS[environment], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantCode,
        merchantRefNum,
        customerName: params.customerName || undefined,
        customerMobile: params.customerPhone || undefined,
        chargeItems,
        returnUrl: params.redirectionUrl,
        orderWebHookUrl: params.notificationUrl,
        signature,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Fawry charge creation failed: ${res.status} ${text}`);
    }

    // The docs don't show a full sample response, so don't bet on one
    // shape: accept either a bare URL string or a JSON object carrying it.
    let checkoutUrl: string | null = null;
    let raw: unknown = text;
    const trimmed = text.trim().replace(/^"|"$/g, "");
    if (/^https?:\/\//i.test(trimmed)) {
      checkoutUrl = trimmed;
    } else {
      try {
        const data = JSON.parse(text);
        raw = data;
        const candidate = data?.nextAction?.redirectUrl ?? data?.redirectUrl ?? data?.paymentUrl ?? data?.url ?? data?.checkoutUrl;
        if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) checkoutUrl = candidate;
      } catch {
        // not JSON and not a URL — falls through to the error below
      }
    }
    if (!checkoutUrl) {
      throw new Error(`Fawry response did not contain a checkout URL: ${text.slice(0, 300)}`);
    }

    return { providerPaymentId: merchantRefNum, checkoutUrl, raw };
  }

  // Fawry puts merchantRefNumber at the top level of the notification —
  // and it's our own order id (set as merchantRefNum above).
  extractOrderId(payload: unknown): string | null {
    const ref = (payload as Record<string, unknown> | null)?.merchantRefNumber;
    return typeof ref === "string" && ref ? ref : null;
  }

  async verifyWebhook(
    payload: unknown,
    _signatureParams: Record<string, string>,
    credentials: Record<string, string>,
  ): Promise<WebhookVerifyResult> {
    const body = (payload ?? {}) as Record<string, unknown>;

    const fawryRefNumber = String(body.fawryRefNumber ?? "");
    const merchantRefNumber = String(body.merchantRefNumber ?? "");
    const orderStatus = String(body.orderStatus ?? "");
    const paymentMethod = String(body.paymentMethod ?? "");
    // Fawry's own spelling ("Refrence") — must match exactly.
    const paymentRefNumber = body.paymentRefrenceNumber ? String(body.paymentRefrenceNumber) : "";

    // Notification signature: fawryRefNumber + merchantRefNumber +
    // paymentAmount(2dp) + orderAmount(2dp) + orderStatus + paymentMethod +
    // paymentRefrenceNumber ("" when absent) + secureKey -> SHA-256 hex.
    const computed = await sha256Hex(
      `${fawryRefNumber}${merchantRefNumber}${twoDp(body.paymentAmount)}${twoDp(body.orderAmount)}` +
        `${orderStatus}${paymentMethod}${paymentRefNumber}${credentials.secure_key ?? ""}`,
    );
    const provided = String(body.messageSignature ?? "").toLowerCase();
    const valid = provided.length > 0 && safeEqual(computed, provided);

    const statusMap: Record<string, WebhookVerifyResult["status"]> = {
      PAID: "paid",
      NEW: "pending",
      CANCELED: "failed",
      FAILED: "failed",
      EXPIRED: "failed",
      REFUNDED: "refunded",
      PARTIAL_REFUNDED: "refunded",
    };

    return {
      valid,
      // Fawry sends several notifications per order (NEW, then PAID...) with
      // the SAME fawryRefNumber. Keying idempotency on that alone would
      // dedupe the PAID event away as a "duplicate" of NEW and the order
      // would never be marked paid — so the status is part of the key.
      // A genuine retry of the same status still dedupes correctly.
      providerEventId: fawryRefNumber ? `${fawryRefNumber}:${orderStatus}` : null,
      eventType: orderStatus ? orderStatus.toLowerCase() : "notification",
      providerPaymentId: merchantRefNumber || null,
      status: statusMap[orderStatus] ?? "pending",
      raw: payload,
    };
  }
}
