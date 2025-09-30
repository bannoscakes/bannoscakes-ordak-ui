-- 005_database_infrastructure.sql
-- Phase 1: Core Database Infrastructure
-- Creates missing tables and helper functions for RPC implementation

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Helper function to check user roles
CREATE OR REPLACE FUNCTION public.check_user_role(
  p_required_role text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
BEGIN
  -- Get user role from staff_shared table
  SELECT role INTO v_user_role
  FROM public.staff_shared
  WHERE user_id = p_user_id
  AND is_active = true;
  
  -- Check if user has required role or higher
  CASE p_required_role
    WHEN 'Staff' THEN
      RETURN v_user_role IN ('Staff', 'Supervisor', 'Admin');
    WHEN 'Supervisor' THEN
      RETURN v_user_role IN ('Supervisor', 'Admin');
    WHEN 'Admin' THEN
      RETURN v_user_role = 'Admin';
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_user_role(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.staff_shared
  WHERE user_id = p_user_id
  AND is_active = true;
  
  RETURN COALESCE(v_role, 'Guest');
END;
$$;

-- =============================================
-- STAFF SHIFTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_shared(user_id) ON DELETE CASCADE,
  shift_start timestamptz NOT NULL,
  shift_end timestamptz,
  break_start timestamptz,
  break_end timestamptz,
  total_break_minutes integer DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for staff_shifts
CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff_id ON public.staff_shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_active ON public.staff_shifts(staff_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_shifts_dates ON public.staff_shifts(shift_start, shift_end);

-- =============================================
-- SETTINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store text NOT NULL CHECK (store IN ('bannos', 'flourlane')),
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store, key)
);

-- Indexes for settings
CREATE INDEX IF NOT EXISTS idx_settings_store_key ON public.settings(store, key);
CREATE INDEX IF NOT EXISTS idx_settings_active ON public.settings(store, is_active) WHERE is_active = true;

-- =============================================
-- COMPONENTS TABLE (Inventory/BOM)
-- =============================================

CREATE TABLE IF NOT EXISTS public.components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  unit text NOT NULL DEFAULT 'each',
  current_stock numeric(10,2) DEFAULT 0,
  min_stock numeric(10,2) DEFAULT 0,
  max_stock numeric(10,2),
  cost_per_unit numeric(10,4),
  supplier text,
  supplier_sku text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for components
CREATE INDEX IF NOT EXISTS idx_components_sku ON public.components(sku);
CREATE INDEX IF NOT EXISTS idx_components_category ON public.components(category);
CREATE INDEX IF NOT EXISTS idx_components_active ON public.components(is_active) WHERE is_active = true;

-- =============================================
-- STAGE EVENTS TABLE (Audit Trail)
-- =============================================

CREATE TABLE IF NOT EXISTS public.stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  store text NOT NULL CHECK (store IN ('bannos', 'flourlane')),
  stage stage_type NOT NULL,
  event text NOT NULL, -- 'started', 'completed', 'paused', 'resumed', 'returned'
  performed_by uuid REFERENCES public.staff_shared(user_id) ON DELETE SET NULL,
  performed_at timestamptz DEFAULT now(),
  notes text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for stage_events
CREATE INDEX IF NOT EXISTS idx_stage_events_order_id ON public.stage_events(order_id);
CREATE INDEX IF NOT EXISTS idx_stage_events_store ON public.stage_events(store);
CREATE INDEX IF NOT EXISTS idx_stage_events_performed_by ON public.stage_events(performed_by);
CREATE INDEX IF NOT EXISTS idx_stage_events_performed_at ON public.stage_events(performed_at);

-- =============================================
-- AUDIT LOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values jsonb,
  new_values jsonb,
  performed_by uuid REFERENCES public.staff_shared(user_id) ON DELETE SET NULL,
  performed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  metadata jsonb
);

-- Indexes for audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON public.audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON public.audit_log(performed_at);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Trigger for staff_shifts
CREATE TRIGGER trg_staff_shifts_updated
  BEFORE UPDATE ON public.staff_shifts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger for settings
CREATE TRIGGER trg_settings_updated
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger for components
CREATE TRIGGER trg_components_updated
  BEFORE UPDATE ON public.components
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_shifts
CREATE POLICY "Users can view their own shifts" ON public.staff_shifts
  FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Users can insert their own shifts" ON public.staff_shifts
  FOR INSERT WITH CHECK (staff_id = auth.uid());

CREATE POLICY "Users can update their own shifts" ON public.staff_shifts
  FOR UPDATE USING (staff_id = auth.uid());

-- RLS Policies for settings (Admin/Supervisor only)
CREATE POLICY "Admin and Supervisor can view settings" ON public.settings
  FOR SELECT USING (public.check_user_role('Supervisor'));

CREATE POLICY "Admin can modify settings" ON public.settings
  FOR ALL USING (public.check_user_role('Admin'));

-- RLS Policies for components (All authenticated users can view, Admin can modify)
CREATE POLICY "Authenticated users can view components" ON public.components
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can modify components" ON public.components
  FOR ALL USING (public.check_user_role('Admin'));

-- RLS Policies for stage_events (All authenticated users can view, Staff can insert)
CREATE POLICY "Authenticated users can view stage events" ON public.stage_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can insert stage events" ON public.stage_events
  FOR INSERT WITH CHECK (public.check_user_role('Staff'));

-- RLS Policies for audit_log (Admin only)
CREATE POLICY "Admin can view audit log" ON public.audit_log
  FOR SELECT USING (public.check_user_role('Admin'));

CREATE POLICY "System can insert audit log" ON public.audit_log
  FOR INSERT WITH CHECK (true); -- System-generated, no user check needed

-- =============================================
-- GRANTS
-- =============================================

-- Grant permissions to authenticated users
GRANT SELECT ON public.staff_shifts TO authenticated;
GRANT INSERT, UPDATE ON public.staff_shifts TO authenticated;
GRANT SELECT ON public.settings TO authenticated;
GRANT SELECT ON public.components TO authenticated;
GRANT SELECT ON public.stage_events TO authenticated;
GRANT INSERT ON public.stage_events TO authenticated;

-- Grant permissions to service role for audit logging
GRANT INSERT ON public.audit_log TO service_role;
GRANT SELECT ON public.audit_log TO authenticated;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.check_user_role(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
