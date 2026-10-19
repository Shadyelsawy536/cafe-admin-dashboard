import { PaymentProvider } from "./payment-provider.ts";
import { PaymobProvider } from "./providers/paymob.ts";
import { FawryProvider } from "./providers/fawry.ts";
import { KashierProvider } from "./providers/kashier.ts";
import { PlaceholderProvider } from "./providers/placeholder.ts";

// Adding a provider = one new class + one new case here + seed rows in
// payment_provider_fields. Nothing in create-payment or payment-webhook
// changes.
export function getProvider(code: string): PaymentProvider {
  switch (code) {
    case "paymob":
      return new PaymobProvider();
    case "fawry":
      return new FawryProvider();
    case "kashier":
      return new KashierProvider();
    default:
      return new PlaceholderProvider(code);
  }
}
