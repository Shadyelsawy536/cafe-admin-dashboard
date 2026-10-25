// r2-upload-url: issues a short-lived, scoped presigned PUT URL so the
// admin dashboard can upload directly to Cloudflare R2 without the
// R2 secret key ever touching the browser.
//
// Required secrets (set via Supabase Dashboard -> Edge Functions -> Secrets,
// never hardcoded here):
//   R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//   R2_PUBLIC_URL_BASE (e.g. https://pub-xxxxxxxx.r2.dev — the exact value
//   Cloudflare assigns once Public Development URL is enabled; this can't
//   be guessed/hardcoded, it's assigned per-bucket)
//   SUPABASE_URL, SUPABASE_ANON_KEY (already available by default in every
//   Edge Function's environment)

import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1.0.20";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const { restaurantId, fileName, contentType } = await req.json();
    if (!restaurantId || !fileName || !contentType) {
      return json({ error: "restaurantId, fileName, and contentType are required" }, 400);
    }

    // Verify the caller is actually staff of THIS restaurant, using their
    // own JWT — this goes through RLS exactly like any other client
    // request, it is NOT a service-role bypass.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: staffRow, error: staffError } = await supabase
      .from("restaurant_users")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (staffError || !staffRow) {
      return json({ error: "Not authorized for this restaurant" }, 403);
    }

    const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const bucket = Deno.env.get("R2_BUCKET")!;
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const publicUrlBase = Deno.env.get("R2_PUBLIC_URL_BASE")!;

    const safeFileName = String(fileName).replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const objectKey = `${restaurantId}/${crypto.randomUUID()}-${safeFileName}`;

    const r2 = new AwsClient({ accessKeyId, secretAccessKey });

    // Matches Cloudflare's own reference pattern for R2 presigned PUT URLs
    // exactly: build the URL, set X-Amz-Expires, sign a Request wrapping it.
    const signUrl = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${objectKey}`);
    signUrl.searchParams.set("X-Amz-Expires", "3600"); // 1 hour

    const signed = await r2.sign(
      new Request(signUrl, {
        method: "PUT",
        headers: { "content-type": contentType },
      }),
      { aws: { signQuery: true } },
    );

    return json({
      uploadUrl: signed.url,
      objectKey,
      publicUrl: `${publicUrlBase}/${objectKey}`,
      contentType,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
