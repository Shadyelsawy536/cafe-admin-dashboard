export type ExistingPaymentEvent = {
  processed: boolean;
  event_type?: string | null;
} | null;

/**
 * A "created" row is a legacy checkout-session record, not proof that the
 * provider webhook was handled. If a provider event ID collides with that
 * legacy value, allow the verified webhook to upgrade the row.
 */
export function isDuplicateProcessedEvent(event: ExistingPaymentEvent): boolean {
  return event?.processed === true && event.event_type !== "created";
}
