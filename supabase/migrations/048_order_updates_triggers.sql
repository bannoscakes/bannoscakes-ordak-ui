-- Migration: Triggers and helper functions
-- Generated: 2025-11-07T05:15:46.198Z
-- Functions: 2

-- Function 1/2: orders_set_human_id
CREATE OR REPLACE FUNCTION public.orders_set_human_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.human_id := new.store::text || '-' ||
                  coalesce(
                    nullif(new.order_number::text, ''),
                    nullif(new.shopify_order_number::text, ''),
                    new.shopify_order_id::text
                  );
  return new;
end
$function$


-- Function 2/2: set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$


