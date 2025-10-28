-- Ensure staff_shared table exists before messaging system
-- This migration creates the staff_shared table if it doesn't exist
-- This prevents the "staff_shared does not exist" error in fresh deployments

-- Create staff_shared table if it doesn't exist
CREATE TABLE IF NOT EXISTS staff_shared (
  user_id UUID PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'Staff' CHECK (role IN ('Admin', 'Supervisor', 'Staff')),
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  store TEXT DEFAULT 'both' CHECK (store IN ('bannos', 'flourlane', 'both'))
);

-- Create index on user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_staff_shared_user_id ON staff_shared(user_id);

-- Enable RLS if not already enabled
ALTER TABLE staff_shared ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'staff_shared' 
    AND policyname = 'Users can view staff_shared'
  ) THEN
    CREATE POLICY "Users can view staff_shared" ON staff_shared
      FOR SELECT USING (true);
  END IF;
END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON staff_shared TO authenticated;
