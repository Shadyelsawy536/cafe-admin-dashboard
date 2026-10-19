import { createClient } from "npm:@supabase/supabase-js@2";
import { decryptJson } from "./_shared/crypto.ts";
import { getProvider } from "./_shared/registry.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);

    // Which provider is calling is stated in the webhook URL itself
    // (?provider=...), set by create-payment — not inferred from the payload
    // shape, which only ever worked while Paymob was the only provider.
    // A missing param means a legacy URL created before provider dispatch
    // existed; every one of those was Paymob, so that stays the default and
    // in-flight Paymob webhooks keep working unchanged.
    const providerCode = url.searchParams.get("provider") ?? "paymob";
    const signatureParams = Object.fromEntries(url.searchParams.entries());
    const kashierSignature = req.headers.get("x-kashier-signature");
    if (kashierSignature) signatureParams["x-kashier-signature"] = kashierSignature;
    const payload = await req.json();
    const provider = getProvider(providerCode);

    let orderId: string | null = null;
    let fawryMerchantRef: string | null = null;
    try {
      if (providerCode === "fawry") {
        // Fawry's merchantRefNumber is a per-attempt external reference, not
        // the internal UUID. Resolve it through payments.provider_order_reference.
        fawryMerchantRef = String((payload as any)?.merchantRefNumber ?? "").trim();
        if (!fawryMerchantRef) return json({ error: "Missing Fawry merchant reference" }, 400);
      } else {
        orderId = provider.extractOrderId(payload);
      }
    } catch {
      return json({ error: `Unsupported payment provider: ${providerCode}` }, 400);
    }

    if (providerCode !== "fawry" && !orderId) {
      return json({ error: "No internal order reference in payload" }, 400);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let fawryPayment: any = null;
    if (providerCode === "fawry") {
      const { data: paymentByReference, error: referenceLookupError } = await adminClient
        .from("payments")
        .select("id, order_id, status, amount, currency, tenant_payment_account_id, provider_order_reference")
        .eq("provider_order_reference", fawryMerchantRef)
        .maybeSingle();
      if (referenceLookupError) throw referenceLookupError;
      if (!paymentByReference) return json({ error: "Fawry payment reference not found" }, 404);
      fawryPayment = paymentByReference;
      orderId = String(paymentByReference.order_id);
    }

    const { data: order } = await adminClient
      .from("orders")
      .select("id, restaurant_id, total")
      .eq("id", String(orderId))
      .maybeSingle();

    if (!order) {
      return json({ error: "Order not found" }, 404);
    }

    // Use the account recorded on this payment, not the restaurant's current
    // active account: provider settings may change while a payment is in flight.
    const providerOrderReference = providerCode === "kashier" ? String((payload as any)?.data?.orderReference ?? "").trim() : "";
    const internalPaymentId = providerCode === "kashier" ? String((payload as any)?.data?.metaData?.internalPaymentId ?? "").trim() : "";
    // Kashier references are unique per payment attempt. Never fall back to
    // the latest payment if a webhook omits the reference: that could mark a
    // different attempt paid or failed.
    if (providerCode === "kashier" && !providerOrderReference && !internalPaymentId) {
      return json({ error: "Missing Kashier payment reference" }, 400);
    }
    let payment: any = fawryPayment;
    if (providerCode !== "fawry") {
      let paymentQuery = adminClient.from("payments").select("id, status, amount, currency, tenant_payment_account_id, provider_order_reference").eq("order_id", order.id);
      if (providerCode === "kashier") {
        if (internalPaymentId) paymentQuery = paymentQuery.eq("id", internalPaymentId);
        else paymentQuery = paymentQuery.eq("provider_order_reference", providerOrderReference);
      }
      const { data: selectedPayment } = await paymentQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
      payment = selectedPayment;

      // Some Kashier test notifications return a gateway-generated orderReference
      // instead of the merchant reference submitted when creating the session.
      // Fall back only when there is exactly one pending attempt for this order
      // using this same provider account; never guess between multiple attempts.
      if (!payment && providerCode === "kashier" && !internalPaymentId) {
        const { data: candidates } = await adminClient
          .from("payments")
          .select("id, status, tenant_payment_account_id, provider_order_reference")
          .eq("order_id", order.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5);
        const matching = [];
        for (const candidate of candidates ?? []) {
          const { data: candidateAccount } = await adminClient
            .from("tenant_payment_accounts")
            .select("id, payment_providers(code)")
            .eq("id", candidate.tenant_payment_account_id)
            .eq("restaurant_id", order.restaurant_id)
            .maybeSingle();
          const candidateCode = (candidateAccount?.payment_providers as unknown as { code: string } | null)?.code;
          if (candidateCode === providerCode) matching.push(candidate);
        }
        if (matching.length === 1) payment = matching[0];
        else if (matching.length > 1) return json({ error: "Ambiguous Kashier payment attempt; exact reference did not match" }, 409);
      }
    }

    if (!payment?.tenant_payment_account_id) {
      return json({ error: "Payment record/account not found" }, 404);
    }

    const { data: account } = await adminClient
      .from("tenant_payment_accounts")
      .select("id, credentials_encrypted, payment_providers(code)")
      .eq("id", payment.tenant_payment_account_id)
      .eq("restaurant_id", order.restaurant_id)
      .maybeSingle();

    if (!account?.credentials_encrypted) {
      return json({ error: "Payment account not found" }, 400);
    }

    const accountProviderCode = (account.payment_providers as unknown as { code: string }).code;
    if (accountProviderCode !== providerCode) {
      return json({ error: "Provider mismatch" }, 400);
    }

    const credentials = (await decryptJson(account.credentials_encrypted)) as Record<string, string>;

    const result = await provider.verifyWebhook(payload, signatureParams, credentials);

    if (!result.valid) {
      return json({ error: "Invalid signature" }, 401);
    }

    if (providerCode === "fawry") {
      const cb = payload as Record<string, unknown>;
      const expected = Number(payment.amount);
      const orderAmount = Number(cb.orderAmount);
      const paymentAmount = Number(cb.paymentAmount);
      if (String(payment.currency ?? "").toUpperCase() !== "EGP" ||
          !Number.isFinite(expected) || !Number.isFinite(orderAmount) ||
          !Number.isFinite(paymentAmount) || Math.abs(orderAmount - expected) > 0.009 ||
          paymentAmount + 0.009 < orderAmount) {
        return json({ error: "Fawry amount/currency mismatch" }, 400);
      }
    }

    if (!result.providerEventId) {
      return json({ error: "Missing provider event id" }, 400);
    }

    const { data: existingEvent } = await adminClient
      .from("payment_events")
      .select("id, processed, event_type")
      .eq("provider", providerCode)
      .eq("provider_event_id", result.providerEventId)
      .maybeSingle();

    if (existingEvent?.processed && existingEvent.event_type !== "created") {
      return json({ received: true, duplicate: true });
    }

    // Providers can send several notifications per payment and not always
    // in order (Fawry: NEW, then PAID). A late "pending"/"failed" must never
    // overwrite a payment already confirmed paid — only a refund may follow.
    const isDowngrade =
      payment.status === "paid" && (result.status === "pending" || result.status === "failed");

    if (!isDowngrade) {
      const { error: paymentUpdateError } = await adminClient
        .from("payments")
        .update({
          status: result.status,
          failure_reason: result.status === "failed" ? "Provider reported failure" : null,
        })
        .eq("id", payment.id);

      if (paymentUpdateError) throw paymentUpdateError;
    }

    // Apply the order transition before marking the provider event processed.
    // If the order update fails, the event stays unprocessed and a provider retry
    // can safely repeat the idempotent payment/order updates.
    if (result.status === "paid") {
      // Do not rewrite the order status here: the restaurant may have already
      // advanced it, or it may have been cancelled while payment was in flight.
      // Only record the verified payment flag; a failed write must keep this
      // webhook retryable.
      const { error: orderUpdateError } = await adminClient
        .from("orders")
        .update({ payment_verified: true })
        .eq("id", order.id);

      if (orderUpdateError) throw orderUpdateError;
    }

    // A legacy "created" event may have reused the gateway payment/session ID
    // as provider_event_id. Reuse that row for the verified webhook instead of
    // acknowledging it as a duplicate or failing the unique provider/event index.
    if (existingEvent) {
      const { error: eventUpdateError } = await adminClient
        .from("payment_events")
        .update({
          payment_id: payment.id,
          event_type: result.eventType,
          processed: true,
        })
        .eq("id", existingEvent.id);
      if (eventUpdateError) throw eventUpdateError;
    } else {
      const { error: eventError } = await adminClient.from("payment_events").insert({
        payment_id: payment.id,
        provider: providerCode,
        event_type: result.eventType,
        provider_event_id: result.providerEventId,
        processed: true,
      });
      if (eventError) throw eventError;
    }

    return json({
      received: true,
      status: result.status,
      orderId: order.id,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
