// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[flip-shopify-oos] Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Missing Supabase env vars" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const storeFilter = url.searchParams.get("store");
    const dryRun = url.searchParams.get("dryRun") === "true";

    const { data: auditRows, error: auditError } = await supabase
      .from("audit_log")
      .select("id, meta")
      .eq("action", "shopify_oos_flip_needed")
      .order("created_at", { ascending: true })
      .limit(50);

    if (auditError) {
      throw auditError;
    }

    const processed: Array<Record<string, unknown>> = [];
    const skipped: Array<Record<string, unknown>> = [];
    const failures: Array<Record<string, unknown>> = [];
    const nowIso = new Date().toISOString();

    for (const row of auditRows ?? []) {
      const meta = (typeof row.meta === "object" && row.meta !== null)
        ? (row.meta as Record<string, unknown>)
        : {};

      if (storeFilter && meta?.store !== storeFilter) {
        skipped.push({
          id: row.id,
          reason: "store_filtered",
          meta,
        });
        continue;
      }

      if (typeof meta?.oos_flip_processed_at === "string") {
        skipped.push({
          id: row.id,
          reason: "already_processed",
        });
        continue;
      }

      const variantId = meta?.shopify_variant_id ?? null;
      const store = meta?.store ?? null;

      console.log("[flip-shopify-oos] pending OOS flip", {
        auditId: row.id,
        store,
        variantId,
      });

      if (!dryRun) {
        const updatedMeta = {
          ...meta,
          oos_flip_processed_at: nowIso,
        };

        const { error: updateError } = await supabase
          .from("audit_log")
          .update({ meta: updatedMeta })
          .eq("id", row.id);

        if (updateError) {
          console.error("[flip-shopify-oos] Failed to mark audit row processed", updateError);
          failures.push({
            id: row.id,
            store,
            variant_id: variantId,
            reason: "update_failed",
            error: updateError?.message ?? updateError,
          });
          continue;
        }

        const { error: insertError } = await supabase
          .from("audit_log")
          .insert({
            action: "shopify_oos_flip_dispatched",
            source: "flip-shopify-oos",
            performed_by: null,
            meta: {
              original_audit_id: row.id,
              store,
              variant_id: variantId,
              processed_at: nowIso,
            },
          });

        if (insertError) {
          console.error("[flip-shopify-oos] Failed to log dispatch audit row", insertError);
          failures.push({
            id: row.id,
            store,
            variant_id: variantId,
            reason: "audit_insert_failed",
            error: insertError?.message ?? insertError,
          });
          continue;
        }
      }

      processed.push({
        id: row.id,
        store,
        variant_id: variantId,
        dryRun,
      });
    }

    return new Response(
      JSON.stringify({
        processedCount: processed.length,
        skippedCount: skipped.length,
        failedCount: failures.length,
        processed,
        skipped,
        failures,
        dryRun,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[flip-shopify-oos] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: `${error}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

