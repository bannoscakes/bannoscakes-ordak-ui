import { serve } from "std/http/server.ts";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" }
  });
}

serve(async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, reason: "method_not_allowed" });

  // optional: ?limit=10&task=kitchen
  const url = new URL(req.url);
  const task = url.searchParams.get("task") ?? "split";
  const limit = Number(url.searchParams.get("limit") ?? "10");
  const rpc = task === "kitchen" ? "process_kitchen_task_create" : "process_webhook_order_split";

  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${rpc}`, {
    method: "POST",
    headers: {
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_limit: Number.isFinite(limit) ? limit : 10 })
  });

  if (!res.ok) return json(500, { ok: false, reason: "rpc_failed", status: res.status });
  const n = await res.json().catch(() => 0);
  return json(200, { ok: true, processed: n });
});

