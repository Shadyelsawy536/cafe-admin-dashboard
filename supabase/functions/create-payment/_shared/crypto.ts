// Symmetric encryption for provider credentials at rest. The key lives
// only in Edge Function secrets (PAYMENT_ENCRYPTION_KEY, base64-encoded
// 32 bytes — generate with `openssl rand -base64 32`), never in Postgres.
// AES-256-GCM via Web Crypto, native in Deno.

async function getKey(): Promise<CryptoKey> {
  const rawKey = Deno.env.get("PAYMENT_ENCRYPTION_KEY");
  if (!rawKey) throw new Error("PAYMENT_ENCRYPTION_KEY is not set");
  const keyBytes = Uint8Array.from(atob(rawKey), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptJson(data: Record<string, unknown>): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptJson(encoded: string): Promise<Record<string, unknown>> {
  const key = await getKey();
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}
