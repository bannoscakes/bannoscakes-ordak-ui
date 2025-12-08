-- Migration: Add staff approval and payroll columns
-- Generated: 2025-11-10
-- Purpose: Enable staff approval workflow and hourly rate for payroll calculations
-- Related: Task 10 in Master_Task.md

-- =============================================================================
-- ADD COLUMNS TO STAFF_SHARED
-- =============================================================================

-- Add approved column for staff approval workflow
ALTER TABLE public.staff_shared
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- Add hourly_rate column for payroll calculations
ALTER TABLE public.staff_shared
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2) NULL;

-- =============================================================================
-- ADD COMMENTS
-- =============================================================================

COMMENT ON COLUMN public.staff_shared.approved IS 'Whether staff member is approved to work (set by Admin). New staff default to false until approved.';
COMMENT ON COLUMN public.staff_shared.hourly_rate IS 'Hourly wage for payroll calculations (Admin-only visible). NULL if not set.';

-- =============================================================================
-- OPTIONAL: AUTO-APPROVE EXISTING STAFF
-- =============================================================================

-- Uncomment this if you want existing active staff to be auto-approved
-- This makes sense for migration - existing staff are already working
-- UPDATE public.staff_shared 
-- SET approved = true 
-- WHERE is_active = true;

