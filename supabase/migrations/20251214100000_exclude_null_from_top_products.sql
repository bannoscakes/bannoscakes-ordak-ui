-- Exclude NULL product_title from top_products analytics
-- POS accessory-only orders have NULL product_title and should not appear in analytics

CREATE OR REPLACE FUNCTION public.get_top_products(p_store text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_limit integer DEFAULT 5)
 RETURNS TABLE(product_title text, order_count bigint, total_revenue numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start date;
  v_end date;
BEGIN
  v_start := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end := COALESCE(p_end_date, CURRENT_DATE);

  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  IF p_store = 'bannos' THEN
    RETURN QUERY
    SELECT
      COALESCE(o.product_title, 'Unknown')::text as product_title,
      COUNT(*)::bigint as order_count,
      COALESCE(SUM(o.total_amount), 0)::numeric as total_revenue
    FROM orders_bannos o
    WHERE o.created_at::date >= v_start
      AND o.created_at::date <= v_end
      AND o.product_title IS NOT NULL
    GROUP BY o.product_title
    ORDER BY COUNT(*) DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT
      COALESCE(o.product_title, 'Unknown')::text as product_title,
      COUNT(*)::bigint as order_count,
      COALESCE(SUM(o.total_amount), 0)::numeric as total_revenue
    FROM orders_flourlane o
    WHERE o.created_at::date >= v_start
      AND o.created_at::date <= v_end
      AND o.product_title IS NOT NULL
    GROUP BY o.product_title
    ORDER BY COUNT(*) DESC
    LIMIT p_limit;
  END IF;
END;
$function$;
