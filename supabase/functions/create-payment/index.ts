import { createClient } from "npm:@supabase/supabase-js@2";
import { decryptJson } from "./_shared/crypto.ts";
import { getProvider } from "./_shared/registry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const { orderId, redirectUrl } = await req.json();
    if (!orderId) return json({ error: "orderId is required" }, 400);

    let validatedRedirectUrl: string | undefined;
    if (redirectUrl) {
      const requested = new URL(String(redirectUrl));
      const requestOrigin = req.headers.get("origin");
      if (!requestOrigin || requested.origin !== requestOrigin) {
        return json({ error: "Invalid payment redirect URL" }, 400);
      }
      requested.searchParams.delete("order");
      requested.searchParams.set("order", orderId);
      validatedRedirectUrl = requested.toString();
    }

    // Confirms the caller actually owns this order — RLS-respecting read
    // using their own JWT, not a service-role bypass.
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: order, error: orderError } = await callerClient
      .from("orders")
      .select("id, restaurant_id, total, customer_name, customer_phone, restaurants(slug)")
      .eq("id", orderId)
      .single();
    if (orderError || !order) return json({ error: "Order not found or not authorized" }, 404);

    // Service-role client — only server-side, needed to decrypt credentials.
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: account, error: accountError } = await adminClient
      .from("tenant_payment_accounts")
      .select("id, credentials_encrypted, currency, payment_providers(code)")
      .eq("restaurant_id", order.restaurant_id)
      .eq("is_active", true)
      .single();
    if (accountError || !account || !account.credentials_encrypted) {
      return json({ error: "No active payment provider configured for this restaurant" }, 400);
    }

    const providerCode = (account.payment_providers as unknown as { code: string }).code;
    const credentials = (await decryptJson(account.credentials_encrypted)) as Record<string, string>;
    const provider = getProvider(providerCode);

    const amountCents = Math.round(Number(order.total) * 100);

    // Create the internal attempt first so each provider callback can be tied to this exact attempt.
    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .insert({ order_id: order.id, tenant_payment_account_id: account.id, amount: order.total, currency: account.currency ?? "EGP", status: "pending" })
      .select("id")
      .single();
    if (paymentError || !payment) return json({ error: "Could not record payment" }, 500);
    let providerOrderReference: string | undefined;
    if (providerCode === "kashier") {
      providerOrderReference = order.id + "-" + payment.id;
    } else if (providerCode === "fawry") {
      // Fawry hosted checkout expects a merchant-owned reference string.
      // Keep it numeric and unique per attempt, then persist it before redirect
      // so the server notification can map it to this exact payment.
      const randomSuffix = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
      providerOrderReference = `${Math.floor(Date.now() / 1000)}${String(randomSuffix).padStart(6, "0")}`;
    }
    if (providerOrderReference) {
      const { error: referenceError } = await adminClient.from("payments").update({ provider_order_reference: providerOrderReference }).eq("id", payment.id);
      if (referenceError) return json({ error: "Could not record payment reference" }, 500);
    }

    let result;
    try {
      result = await provider.createPayment({
      orderId: order.id,
      providerOrderReference,
      amountCents,
      currency: account.currency ?? "EGP",
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      credentials,
      // payment-webhook needs to know whose payload it is receiving. Paymob
      // keeps its exact original URL untouched (it appends ?hmac=... itself,
      // and payment-webhook defaults to paymob when no provider is given);
      // every other provider carries ?provider=<code>.
      notificationUrl: providerCode === "paymob"
        ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`
        : `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook?provider=${encodeURIComponent(providerCode)}`,
      redirectionUrl: (() => {
      const restaurantSlug = (order.restaurants as unknown as { slug: string } | null)?.slug;
      if (!restaurantSlug) throw new Error("Restaurant slug is missing");
      if (validatedRedirectUrl) return validatedRedirectUrl;
      const origin = Deno.env.get("APP_REDIRECT_URL");
      if (!origin) throw new Error("Payment redirect URL is not configured");
      const base = origin.replace(/\/$/, "");
      return base + "/?restaurant=" + encodeURIComponent(restaurantSlug) + "&order=" + encodeURIComponent(order.id);
    })(),
    });
    } catch (providerError) {
      await adminClient.from("payments").update({ status: "failed", failure_reason: "Provider session creation failed" }).eq("id", payment.id);
      throw providerError;
    }

    // The Order System never sees provider details beyond this point — it only gets a checkout URL back.

    await adminClient.from("payment_events").insert({
      payment_id: payment.id,
      provider: providerCode,
      event_type: "created",
      provider_event_id: null, // Session/payment IDs are not webhook event IDs; avoid cross-event dedupe collisions.
      processed: true,
    });

    return json({ checkoutUrl: result.checkoutUrl, paymentId: payment.id });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
