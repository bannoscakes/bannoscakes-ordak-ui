// Minimal test version
import { serve } from "std/http/server.ts";

serve(async (req) => {
  const method = req.method.toUpperCase();
  
  if (method === "GET") {
    return new Response("ok", { status: 200 });
  }
  
  if (method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  
  return new Response("ok", { status: 200 });
});

