-- Migration: Analytics RPCs for store dashboards
-- Purpose: Provide real analytics data for Bannos/Flourlane analytics pages

BEGIN;

-- =============================================================================
-- get_store_analytics: Main analytics summary for a store
-- Returns: revenue, order counts, avg order value, pending today
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_store_analytics(
  p_store text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  total_revenue numeric,
  total_orders bigint,
  avg_order_value numeric,
  pending_today bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_start date;
  v_end date;
BEGIN
  -- Default to last 30 days if no dates provided
  v_start := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end := COALESCE(p_end_date, CURRENT_DATE);

  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  IF p_store = 'bannos' THEN
    RETURN QUERY
    SELECT
      COALESCE(SUM(o.total_amount), 0)::numeric as total_revenue,
      COUNT(*)::bigint as total_orders,
      COALESCE(AVG(o.total_amount), 0)::numeric as avg_order_value,
      (SELECT COUNT(*)::bigint FROM orders_bannos WHERE stage != 'Complete' AND due_date = CURRENT_DATE) as pending_today
    FROM orders_bannos o
    WHERE o.created_at::date >= v_start
      AND o.created_at::date <= v_end;
  ELSE
    RETURN QUERY
    SELECT
      COALESCE(SUM(o.total_amount), 0)::numeric as total_revenue,
      COUNT(*)::bigint as total_orders,
      COALESCE(AVG(o.total_amount), 0)::numeric as avg_order_value,
      (SELECT COUNT(*)::bigint FROM orders_flourlane WHERE stage != 'Complete' AND due_date = CURRENT_DATE) as pending_today
    FROM orders_flourlane o
    WHERE o.created_at::date >= v_start
      AND o.created_at::date <= v_end;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_store_analytics(text, date, date) TO authenticated;

-- =============================================================================
-- get_revenue_by_day: Daily revenue/orders for charts
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_revenue_by_day(
  p_store text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  day date,
  revenue numeric,
  orders bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
      o.created_at::date as day,
      COALESCE(SUM(o.total_amount), 0)::numeric as revenue,
      COUNT(*)::bigint as orders
    FROM orders_bannos o
    WHERE o.created_at::date >= v_start
      AND o.created_at::date <= v_end
    GROUP BY o.created_at::date
    ORDER BY o.created_at::date;
  ELSE
    RETURN QUERY
    SELECT
      o.created_at::date as day,
      COALESCE(SUM(o.total_amount), 0)::numeric as revenue,
      COUNT(*)::bigint as orders
    FROM orders_flourlane o
    WHERE o.created_at::date >= v_start
      AND o.created_at::date <= v_end
    GROUP BY o.created_at::date
    ORDER BY o.created_at::date;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_revenue_by_day(text, date, date) TO authenticated;

-- =============================================================================
-- get_top_products: Top N products by order count
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_top_products(
  p_store text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_limit integer DEFAULT 5
)
RETURNS TABLE(
  product_title text,
  order_count bigint,
  total_revenue numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
    GROUP BY o.product_title
    ORDER BY COUNT(*) DESC
    LIMIT p_limit;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_top_products(text, date, date, integer) TO authenticated;

-- =============================================================================
-- get_weekly_forecast: Orders grouped by day of week for a given week
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_weekly_forecast(
  p_store text,
  p_week_start date DEFAULT NULL  -- Monday of the week to query
)
RETURNS TABLE(
  day_of_week integer,  -- 1=Mon, 7=Sun
  day_date date,
  total_orders bigint,
  completed_orders bigint,
  pending_orders bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_week_start date;
  v_week_end date;
BEGIN
  -- Default to current week (Monday)
  v_week_start := COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::date);
  v_week_end := v_week_start + INTERVAL '6 days';

  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  IF p_store = 'bannos' THEN
    RETURN QUERY
    WITH week_days AS (
      SELECT
        generate_series(1, 7) as dow,
        generate_series(v_week_start, v_week_end, '1 day'::interval)::date as d
    )
    SELECT
      wd.dow::integer as day_of_week,
      wd.d as day_date,
      COALESCE(COUNT(o.id), 0)::bigint as total_orders,
      COALESCE(COUNT(o.id) FILTER (WHERE o.stage = 'Complete'), 0)::bigint as completed_orders,
      COALESCE(COUNT(o.id) FILTER (WHERE o.stage != 'Complete'), 0)::bigint as pending_orders
    FROM week_days wd
    LEFT JOIN orders_bannos o ON o.due_date = wd.d
    GROUP BY wd.dow, wd.d
    ORDER BY wd.dow;
  ELSE
    RETURN QUERY
    WITH week_days AS (
      SELECT
        generate_series(1, 7) as dow,
        generate_series(v_week_start, v_week_end, '1 day'::interval)::date as d
    )
    SELECT
      wd.dow::integer as day_of_week,
      wd.d as day_date,
      COALESCE(COUNT(o.id), 0)::bigint as total_orders,
      COALESCE(COUNT(o.id) FILTER (WHERE o.stage = 'Complete'), 0)::bigint as completed_orders,
      COALESCE(COUNT(o.id) FILTER (WHERE o.stage != 'Complete'), 0)::bigint as pending_orders
    FROM week_days wd
    LEFT JOIN orders_flourlane o ON o.due_date = wd.d
    GROUP BY wd.dow, wd.d
    ORDER BY wd.dow;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_weekly_forecast(text, date) TO authenticated;

-- =============================================================================
-- get_delivery_breakdown: Pickup vs Delivery counts for a week
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_delivery_breakdown(
  p_store text,
  p_week_start date DEFAULT NULL
)
RETURNS TABLE(
  delivery_method text,
  order_count bigint,
  percentage numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_week_start date;
  v_week_end date;
  v_total bigint;
BEGIN
  v_week_start := COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::date);
  v_week_end := v_week_start + INTERVAL '6 days';

  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  IF p_store = 'bannos' THEN
    -- Get total for percentage calculation
    SELECT COUNT(*) INTO v_total
    FROM orders_bannos
    WHERE due_date >= v_week_start AND due_date <= v_week_end;

    RETURN QUERY
    SELECT
      COALESCE(NULLIF(trim(o.delivery_method), ''), 'Unknown')::text as delivery_method,
      COUNT(*)::bigint as order_count,
      CASE WHEN v_total > 0
        THEN ROUND((COUNT(*)::numeric / v_total::numeric) * 100, 1)
        ELSE 0
      END as percentage
    FROM orders_bannos o
    WHERE o.due_date >= v_week_start AND o.due_date <= v_week_end
    GROUP BY COALESCE(NULLIF(trim(o.delivery_method), ''), 'Unknown')
    ORDER BY COUNT(*) DESC;
  ELSE
    SELECT COUNT(*) INTO v_total
    FROM orders_flourlane
    WHERE due_date >= v_week_start AND due_date <= v_week_end;

    RETURN QUERY
    SELECT
      COALESCE(NULLIF(trim(o.delivery_method), ''), 'Unknown')::text as delivery_method,
      COUNT(*)::bigint as order_count,
      CASE WHEN v_total > 0
        THEN ROUND((COUNT(*)::numeric / v_total::numeric) * 100, 1)
        ELSE 0
      END as percentage
    FROM orders_flourlane o
    WHERE o.due_date >= v_week_start AND o.due_date <= v_week_end
    GROUP BY COALESCE(NULLIF(trim(o.delivery_method), ''), 'Unknown')
    ORDER BY COUNT(*) DESC;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_delivery_breakdown(text, date) TO authenticated;

COMMIT;
