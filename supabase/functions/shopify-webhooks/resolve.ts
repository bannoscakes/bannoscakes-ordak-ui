// @ts-nocheck

export function resolveStoreSecrets(slugOrDomain?: string | null): {
  hmacSecret?: string;
} {
  const s = (slugOrDomain ?? "").toLowerCase();

  if (s === "bannos" || s === "bannos.myshopify.com") {
    const sec = Deno.env.get("SHOPIFY_APP_SECRET_BANNOS");
    return { hmacSecret: sec ? sec.trim() : undefined };   // <-- trim here
  }

  if (s === "flourlane" || s === "flour-lane.myshopify.com") {
    const sec = Deno.env.get("SHOPIFY_APP_SECRET_FLOURLANE")
      ?? Deno.env.get("SHOPIFY_APP_SECRET_FLOUR");
    return { hmacSecret: sec ? sec.trim() : undefined };   // <-- and here
  }

  return {};
}
