/// <reference lib="deno.ns" />
/// <reference lib="dom" />

// supabase/functions/shopify-webhooks/resolve.ts

/**
 * Resolve the appropriate Shopify app secret based on store identifier.
 * 
 * @param slugOrDomain - Store slug from query param or shop domain from header
 * @returns The environment variable value for the matched store, or undefined
 */
export function resolveStoreSecret(slugOrDomain?: string | null): string | undefined {
  const s = (slugOrDomain ?? "").toLowerCase();

  // Bannos
  if (s.includes("bannos") || s === "bannos" || s.endsWith("bannos.myshopify.com")) {
    return Deno.env.get("SHOPIFY_APP_SECRET_BANNOS") ?? undefined;
  }

  // Flour Lane - use exact matches or full domain only to avoid false positives
  if (
    s === "flour-lane" || s === "flourlane" || s === "flour" ||
    s.endsWith("flour-lane.myshopify.com")
  ) {
    return (
      Deno.env.get("SHOPIFY_APP_SECRET_FLOURLANE") ??
      Deno.env.get("SHOPIFY_APP_SECRET_FLOUR") ?? // optional fallback
      undefined
    );
  }

  return undefined;
}

