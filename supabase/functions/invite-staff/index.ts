// invite-staff: creates a pending auth account for a new staff member and
// links them to this restaurant with the chosen role. Must run server-side
// — inviting users requires the service-role admin API, which can never be
// exposed to the browser.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const { restaurantId, email, roleId } = await req.json();
    if (!restaurantId || !email || !roleId) {
      return json({ error: "restaurantId, email, and roleId are required" }, 400);
    }

    // Verify the CALLER is staff of this restaurant, using their own JWT —
    // this respects RLS, it is not a service-role bypass.
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: staffRow } = await callerClient
      .from("restaurant_users")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (!staffRow) return json({ error: "Not authorized for this restaurant" }, 403);

    // Confirm the role being assigned actually belongs to THIS restaurant —
    // stops a caller from assigning some other restaurant's role id.
    const { data: roleRow } = await callerClient
      .from("roles")
      .select("id")
      .eq("id", roleId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (!roleRow) return json({ error: "Invalid role for this restaurant" }, 400);

    // Service-role client — only ever used server-side, never in the browser.
    // SUPABASE_SERVICE_ROLE_KEY is auto-provided in every Edge Function's
    // environment, no manual secret setup needed for this one.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);
    if (inviteError || !invited?.user) {
      return json({ error: inviteError?.message ?? "Could not invite user" }, 500);
    }

    const { error: linkError } = await adminClient
      .from("restaurant_users")
      .insert({ restaurant_id: restaurantId, user_id: invited.user.id, role_id: roleId });

    if (linkError) {
      return json({ error: `Invited, but couldn't grant restaurant access: ${linkError.message}` }, 500);
    }

    return json({ success: true, userId: invited.user.id });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
