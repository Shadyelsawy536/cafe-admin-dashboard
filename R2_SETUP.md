# Cloudflare R2 Setup — Remaining Steps

## Already done
- ✅ Bucket created: `cafe-platform-media`
- ✅ API token created (Access Key ID + Secret Access Key generated)

## Step 1 — Enable Public Development URL

Product images need to be publicly viewable by customers with no auth, but
R2 buckets are private by default. In the Cloudflare dashboard:

1. **R2** → **cafe-platform-media** → **Settings**
2. Under **Public Development URL**, click **Allow Access**
3. Cloudflare will show you a URL like `https://pub-XXXXXXXXXXXX.r2.dev`
   — **copy this exact URL**, you'll need it in Step 2. It's assigned
   uniquely per bucket; there's no way to predict or hardcode it in advance.

*(A custom domain, e.g. `media.yourcafe.com`, is a nicer long-term option
instead of the raw `.r2.dev` URL — but requires you to own a domain and
add a DNS record. The Public Development URL works fine to start; this can
be swapped later without touching any code, just the one env var below.)*

## Step 2 — Add secrets to the Supabase Edge Function

These values must **never** go in the React dashboard, the Flutter app, or
any file in this repo — only here, in Supabase's own secrets manager:

1. Supabase Dashboard → your project → **Edge Functions** → **Secrets**
2. Add each of these:

| Key | Value |
|---|---|
| `R2_ACCOUNT_ID` | Your Cloudflare Account ID |
| `R2_BUCKET` | `cafe-platform-media` |
| `R2_ACCESS_KEY_ID` | The Access Key ID from your R2 API token |
| `R2_SECRET_ACCESS_KEY` | The Secret Access Key from your R2 API token |
| `R2_PUBLIC_URL_BASE` | The `https://pub-XXXXXXXXXXXX.r2.dev` URL from Step 1 (no trailing slash) |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` don't need adding — every Edge
Function gets those automatically.

## Step 3 — Deploy the function

The function code is already written: `edge-functions/r2-upload-url/index.ts`
in this project. Once Steps 1–2 are done, tell me and I'll deploy it via
my Supabase tools — takes one call, no local CLI needed on your end.

## Step 4 — What it does once live

The admin dashboard's Menu Management image upload will call this function
to get a short-lived (1 hour), scoped presigned URL, upload the file
directly to R2 using that URL, then save the resulting public URL onto the
product. The R2 secret key itself never reaches the browser at any point —
only this server-side function ever touches it.

---

**No rush on any of this** — I'm continuing to build the rest of the
dashboard in parallel. The image upload button will simply show a clear
"not configured yet" state until these steps are done; everything else
(categories, products, variants, modifier groups, pricing) works
regardless.
