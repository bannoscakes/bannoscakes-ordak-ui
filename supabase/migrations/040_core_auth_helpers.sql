-- Migration: Core authentication and authorization helpers
-- Generated: 2025-11-07T05:15:46.193Z
-- Functions: 10
-- 
-- IMPORTANT: This migration creates minimal table stubs for tables that already exist in production.
-- These CREATE TABLE IF NOT EXISTS statements ensure migrations work in Preview environments.
-- In production, these tables already exist with full schema, so these statements are skipped.

-- ============================================================================
-- TABLE STUBS (Minimal schemas for tables that exist in production)
-- ============================================================================

-- Staff/User management table
CREATE TABLE IF NOT EXISTS staff_shared (
  row_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Staff',
  store text NOT NULL DEFAULT 'bannos',
  is_active boolean NOT NULL DEFAULT true,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  store text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store, key)
);

-- ============================================================================
-- HELPER FUNCTIONS (No dependencies)
-- ============================================================================

-- Function: _order_lock
-- Purpose: Advisory lock for order operations
CREATE OR REPLACE FUNCTION public._order_lock(p_order_id uuid)
 RETURNS void
 LANGUAGE sql
AS $function$
  select pg_advisory_xact_lock(hashtext(p_order_id::text));
$function$
;

-- Function: alpha_suffix
-- Purpose: Generate Excel-style column suffixes (A, B, C, ... Z, AA, AB, ...)
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

-- ============================================================================
-- AUTHENTICATION FUNCTIONS (Level 1 - No dependencies on other app functions)
-- ============================================================================

-- Function: auth_email
-- Purpose: Get current user's email from JWT
CREATE OR REPLACE FUNCTION public.auth_email()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
select coalesce( (current_setting('request.jwt.claims', true)::jsonb ->> 'email'), '' );
$function$
;

-- Function: app_is_service_role
-- Purpose: Check if current request is from service role
CREATE OR REPLACE FUNCTION public.app_is_service_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
select coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role';
$function$
;

-- Function: current_user_name
-- Purpose: Get current user's display name from JWT
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

-- ============================================================================
-- AUTHORIZATION FUNCTIONS (Level 2 - Depend on Level 1)
-- ============================================================================

-- Function: app_role
-- Purpose: Get user's role from staff_shared table
-- NOTE: Uses staff_shared (not users) as that's the active table in production
CREATE OR REPLACE FUNCTION public.app_role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
select coalesce( (select role from staff_shared where email = auth_email() limit 1), 'Staff');
$function$
;

-- Function: app_can_access_store
-- Purpose: Check if user can access a specific store
-- NOTE: Uses staff_shared.store column (text: 'bannos', 'flourlane', or 'both')
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

-- Function: feature_rls_enabled
-- Purpose: Check if RLS feature flag is enabled
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

-- ============================================================================
-- RLS BYPASS (Level 3 - Depends on Level 1 and Level 2)
-- ============================================================================

-- Function: rls_bypass
-- Purpose: Determine if RLS should be bypassed for current request
CREATE OR REPLACE FUNCTION public.rls_bypass()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
select (not feature_rls_enabled()) or app_is_service_role();
$function$
;

-- ============================================================================
-- SETTINGS HELPERS
-- ============================================================================

-- Function: settings_get_bool
-- Purpose: Get boolean setting with fallback default
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
