export type NormalizedPaymentStatus = "paid" | "failed" | "pending" | "refunded";

export function normalizePaymobWebhook(obj: Record<string, unknown>): {
  providerEventId: string | null;
  status: NormalizedPaymentStatus;
} {
  const id = obj.id == null ? "" : String(obj.id);
  const status: NormalizedPaymentStatus =
    obj.is_refunded === true ? "refunded" :
    obj.pending === true ? "pending" :
    obj.success === true ? "paid" : "failed";
  // A Paymob transaction can later emit a refund/void/pending notification
  // with the same transaction ID. Include the state so a prior event cannot
  // suppress a legitimate later state transition, while exact retries dedupe.
  const phase =
    obj.is_refunded === true ? "refunded" :
    obj.is_voided === true ? "voided" :
    obj.pending === true ? "pending" :
    obj.success === true ? "paid" : "failed";
  return { providerEventId: id ? `${id}:${phase}` : null, status };
}

export function normalizeKashierEventId(
  providerId: string,
  event: string,
  status: string,
): string | null {
  const id = providerId.trim();
  if (!id) return null;
  return `${id}:${event.trim().toLowerCase() || "payment"}:${status.trim().toLowerCase() || "unknown"}`;
}
