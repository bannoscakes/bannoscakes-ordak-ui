/**
 * Minimal Shopify webhook handler for Edge Functions.
 * 
 * This is a temporary implementation that handles basic HTTP requests while
 * the full HMAC validation and idempotency logic is being debugged.
 * 
 * @module shopify-webhooks
 */

import { serve } from "std/http/server.ts";

/**
 * HTTP server handler for Shopify webhook endpoints.
 * 
 * Handles GET and POST requests with 200 OK responses.
 * Returns 405 Method Not Allowed for other HTTP methods.
 * 
 * @param {Request} req - The incoming HTTP request
 * @returns {Promise<Response>} HTTP response with appropriate status code
 */
serve(async (req) => {
  const method = req.method.toUpperCase();
  
  if (method === "GET") {
    return new Response("ok", { status: 200 });
  }
  
  if (method !== "POST") {
    return new Response("method not allowed", {
      status: 405,
      headers: { "Allow": "GET, POST" },
    });
  }
  
  return new Response("ok", { status: 200 });
});
