import {
  PaymentProvider,
  CreatePaymentParams,
  CreatePaymentResult,
  WebhookVerifyResult,
  NotImplementedError,
} from "../payment-provider.ts";

// Every unimplemented provider (PayTabs, Stripe, Adyen, Kashier) resolves
// here — it satisfies the interface but throws clearly instead of
// pretending to work.
export class PlaceholderProvider implements PaymentProvider {
  constructor(private name: string) {}

  async createPayment(_params: CreatePaymentParams): Promise<CreatePaymentResult> {
    throw new NotImplementedError(this.name, "createPayment");
  }

  extractOrderId(_payload: unknown): string | null {
    throw new NotImplementedError(this.name, "extractOrderId");
  }

  async verifyWebhook(): Promise<WebhookVerifyResult> {
    throw new NotImplementedError(this.name, "verifyWebhook");
  }
}
