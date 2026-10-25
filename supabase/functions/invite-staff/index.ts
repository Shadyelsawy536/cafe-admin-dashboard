// invite-staff: invite a staff member into exactly one restaurant.
// The caller must be an authenticated owner with staff.manage permission.
// All service-role operations stay server-side.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const body = await req.json();
    const restaurantId = typeof body.restaurantId === "string" ? body.restaurantId : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const roleId = typeof body.roleId === "string" ? body.roleId : "";
    if (!restaurantId || !email || !roleId) {
      return json({ error: "restaurantId, email, and roleId are required" }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "A valid email address is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing required Supabase environment configuration");
      return json({ error: "Invitation service is not configured" }, 500);
    }

    // Resolve the authenticated caller explicitly; never trust a user id from the request.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    const caller = authData.user;
    if (authError || !caller) return json({ error: "Invalid or expired session" }, 401);

    // Query only this caller's membership for the requested restaurant.
    const { data: staffRow, error: staffError } = await callerClient
      .from("restaurant_users")
      .select("id, user_id, roles(name, role_permissions(permissions(key)))")
      .eq("restaurant_id", restaurantId)
      .eq("user_id", caller.id)
      .maybeSingle();

    if (staffError || !staffRow) {
      return json({ error: "Not authorized for this restaurant" }, 403);
    }

    const role = staffRow.roles as unknown as {
      name?: string;
      role_permissions?: { permissions?: { key?: string } | null }[] | null;
    } | null;
    const isOwner = role?.name?.trim().toLowerCase() === "owner";
    const canManageStaff = (role?.role_permissions ?? []).some(
      (rp) => rp.permissions?.key === "staff.manage",
    );
    // Match the database's restaurant_users insert policy: owner + staff.manage.
    if (!isOwner || !canManageStaff) {
      return json({ error: "Only a restaurant owner with staff.manage permission can invite staff" }, 403);
    }

    // Reject inactive/suspended tenants before using the service role.
    const { data: restaurant, error: restaurantError } = await callerClient
      .from("restaurants")
      .select("id, status")
      .eq("id", restaurantId)
      .maybeSingle();
    if (restaurantError || !restaurant || ["suspended", "inactive"].includes(String(restaurant.status).toLowerCase())) {
      return json({ error: "Restaurant is not active or does not exist" }, 403);
    }

    // The selected role must belong to the same restaurant.
    const { data: roleRow, error: roleError } = await callerClient
      .from("roles")
      .select("id")
      .eq("id", roleId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (roleError || !roleRow) return json({ error: "Invalid role for this restaurant" }, 400);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Invite via Supabase Auth; the service-role key never leaves this function.
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);
    if (inviteError || !invited?.user) {
      return json({ error: inviteError?.message ?? "Could not invite user" }, 500);
    }

    // Explicitly create one membership for the requested restaurant only.
    const { error: linkError } = await adminClient
      .from("restaurant_users")
      .insert({ restaurant_id: restaurantId, user_id: invited.user.id, role_id: roleId });

    if (linkError) {
      // Avoid leaving an Auth account with no tenant membership if linking fails.
      await adminClient.auth.admin.deleteUser(invited.user.id);
      console.error("Could not link invited user to restaurant:", linkError.message);
      return json({ error: "Invitation could not be linked to this restaurant. Please try again." }, 500);
    }

    return json({ success: true, userId: invited.user.id, restaurantId });
  } catch (err) {
    console.error("invite-staff failed:", err);
    return json({ error: "Invitation failed. Please try again." }, 500);
  }
});
