-- =====================================================
-- Migration: CORE AUTH HELPERS
-- Date: 2025-11-07
-- Description: Extract production RPCs for core auth helpers
-- =====================================================
-- 
-- Functions in this migration:
--   - _order_lock
--   - alpha_suffix
--   - app_can_access_store
--   - app_is_service_role
--   - app_role
--   - auth_email
--   - current_user_name
--   - feature_rls_enabled
--   - rls_bypass
--   - settings_get_bool
--
-- =====================================================

-- Ensure staff_shared table exists (required for app_role and app_can_access_store)
CREATE TABLE IF NOT EXISTS public.staff_shared (
  user_id UUID PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'Staff' CHECK (role IN ('Admin', 'Supervisor', 'Staff')),
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  store TEXT DEFAULT 'both' CHECK (store IN ('bannos', 'flourlane', 'both'))
);

-- Ensure settings table exists (required for feature_rls_enabled and settings_get_bool)
CREATE TABLE IF NOT EXISTS public.settings (
  store TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (store, key)
);

-- Ensure orders tables exist (required for queue, scanner, and worker RPCs)
-- Note: These tables exist in production with full schema.
-- This is a minimal schema for CI/preview environments.
CREATE TABLE IF NOT EXISTS public.orders_bannos (
  row_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id TEXT UNIQUE NOT NULL,
  shopify_order_id BIGINT,
  shopify_order_number INTEGER,
  assignee_id UUID,
  stage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders_flourlane (
  row_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id TEXT UNIQUE NOT NULL,
  shopify_order_id BIGINT,
  shopify_order_number INTEGER,
  assignee_id UUID,
  stage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function: _order_lock
CREATE OR REPLACE FUNCTION public._order_lock(p_order_id uuid)
 RETURNS void
 LANGUAGE sql
AS $function$
  select pg_advisory_xact_lock(hashtext(p_order_id::text));
$function$
;

-- Function: alpha_suffix
CREATE OR REPLACE FUNCTION public.alpha_suffix(p_idx integer)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  n int := p_idx;
  s text := '';
  r int;
begin
  if n < 0 then
    return 'A';
  end if;
  loop
    r := n % 26;
    s := chr(65 + r) || s;   -- 65 = 'A'
    n := (n / 26) - 1;       -- 0-based to Excel-like
    exit when n < 0;
  end loop;
  return s;
end;
$function$
;

-- Function: auth_email (MOVED UP - dependency for app_role and app_can_access_store)
CREATE OR REPLACE FUNCTION public.auth_email()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
select coalesce( (current_setting('request.jwt.claims', true)::jsonb ->> 'email'), '' );
$function$
;

-- Function: app_role (MOVED UP - dependency for app_can_access_store)
CREATE OR REPLACE FUNCTION public.app_role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
select coalesce( (select role from staff_shared where email = auth_email() limit 1), 'Staff');
$function$
;

-- Function: app_can_access_store (depends on app_role and auth_email)
CREATE OR REPLACE FUNCTION public.app_can_access_store(s text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
select
  app_role() = 'Admin'
  or exists (
    select 1
    from staff_shared u
    where u.email = auth_email()
      and (u.store = 'both' or u.store = s)
  );
$function$
;

-- Function: app_is_service_role (dependency for rls_bypass)
CREATE OR REPLACE FUNCTION public.app_is_service_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
select coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role';
$function$
;

-- Function: current_user_name
CREATE OR REPLACE FUNCTION public.current_user_name()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'full_name'),
    (auth.jwt() ->> 'email'),
    'Unknown'
  );
$function$
;

-- Function: feature_rls_enabled (dependency for rls_bypass)
CREATE OR REPLACE FUNCTION public.feature_rls_enabled()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
select coalesce(
  (select (value->>'enabled')::boolean from settings where store = 'global' and key = 'rls' limit 1),
  false
);
$function$
;

-- Function: rls_bypass (depends on feature_rls_enabled and app_is_service_role)
CREATE OR REPLACE FUNCTION public.rls_bypass()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
select (not feature_rls_enabled()) or app_is_service_role();
$function$
;

-- Function: settings_get_bool
CREATE OR REPLACE FUNCTION public.settings_get_bool(ns text, k text, default_value boolean)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce((
    select
      case
        when jsonb_typeof(s.value) = 'boolean' then (s.value)::boolean
        when jsonb_typeof(s.value) is null then default_value
        else
          case
            when lower(trim(both '"' from (s.value)::text)) in ('1','true','yes','on') then true
            else false
          end
      end
    from public.settings s
    where s.store = ns and s.key = k
    limit 1
  ), default_value);
$function$
;

