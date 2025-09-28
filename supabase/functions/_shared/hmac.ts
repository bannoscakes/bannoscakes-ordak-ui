/**
 * verifyShopifyHmac(secret, rawBody, headerHmac)
 * Returns true if headerHmac === HMAC-SHA256(rawBody, secret) in base64.
 */
export async function verifyShopifyHmac(secret: string, rawBody: string | Uint8Array, headerHmac: string | null): Promise<boolean> {
  if (!secret || !headerHmac) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bodyBytes = typeof rawBody === "string" ? enc.encode(rawBody) : rawBody;
  const sig = await crypto.subtle.sign("HMAC", key, bodyBytes);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return timingSafeEqual(b64, headerHmac);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
