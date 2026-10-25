// The Order System only ever talks to this interface — never a specific
// provider's SDK/API directly.

export interface CreatePaymentParams {
  orderId: string;
  providerOrderReference?: string;
  amountCents: number;
  currency: string;
  customerName: string;
  customerPhone: string;
  credentials: Record<string, string>;
  notificationUrl: string;
  redirectionUrl: string;
}
export interface CreatePaymentResult {
  providerPaymentId: string;
  checkoutUrl: string;
  raw: unknown;
}
export interface WebhookVerifyResult {
  valid: boolean;
  providerEventId: string | null;
  eventType: string;
  providerPaymentId: string | null;
  status: "paid" | "failed" | "pending" | "refunded";
  raw: unknown;
}

export interface PaymentProvider {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  // Pulls the internal order id out of an UNVERIFIED webhook payload, so
  // payment-webhook knows which restaurant/credentials to check against
  // before anything is decrypted or trusted. Every provider shapes its
  // payload differently (Paymob nests it under obj.payment_key_claims.extra;
  // Fawry puts merchantRefNumber at the top level) — the webhook URL itself
  // now says which provider is calling (?provider=...), so this no longer
  // has to be Paymob-specific logic living in the shared handler.
  extractOrderId(payload: unknown): string | null;
  verifyWebhook(
    payload: unknown,
    signatureParams: Record<string, string>,
    credentials: Record<string, string>,
  ): Promise<WebhookVerifyResult>;
  getPaymentStatus?(providerPaymentId: string, credentials: Record<string, string>): Promise<string>;
  refundPayment?(providerPaymentId: string, amountCents: number, credentials: Record<string, string>): Promise<boolean>;
}

export class NotImplementedError extends Error {
  constructor(provider: string, method: string) {
    super(`${provider} does not implement ${method} yet.`);
  }
}
