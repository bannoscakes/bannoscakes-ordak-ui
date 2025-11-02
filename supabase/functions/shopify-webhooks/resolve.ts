/// <reference lib="deno.ns" />
/// <reference lib="dom" />

// supabase/functions/shopify-webhooks/resolve.ts

export function resolveStoreSecret(slugOrDomain?: string | null): string | undefined {
  const s = (slugOrDomain ?? "").toLowerCase();

  // Accept only these exact identifiers:
  // - Slugs: "bannos", "flourlane"
  // - Shopify domains: "bannos.myshopify.com", "flour-lane.myshopify.com"

  if (s === "bannos" || s === "bannos.myshopify.com") {
    return Deno.env.get("SHOPIFY_APP_SECRET_BANNOS") ?? undefined;
  }

  if (s === "flourlane" || s === "flour-lane.myshopify.com") {
    return (
      Deno.env.get("SHOPIFY_APP_SECRET_FLOURLANE") ??
      Deno.env.get("SHOPIFY_APP_SECRET_FLOUR") ?? // optional legacy fallback
      undefined
    );
  }

  return undefined; // anything else is rejected
}
