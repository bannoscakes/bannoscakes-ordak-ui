function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

/** Verify Shopify HMAC over the **raw** request body bytes using the provided secret. */
export async function verifyShopifyHmac(
  headers: Headers,
  rawBody: ArrayBuffer | Uint8Array,
  secret: string,
): Promise<boolean> {
  const sig =
    headers.get("X-Shopify-Hmac-Sha256") ||
    headers.get("x-shopify-hmac-sha256") ||
    "";
  if (!secret || !sig) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = rawBody instanceof Uint8Array ? rawBody : new Uint8Array(rawBody);
  const mac = await crypto.subtle.sign("HMAC", key, bytes);
  const expected = toBase64(new Uint8Array(mac));
  return timingSafeEqual(expected, sig);
}
