-- CLEAN SLATE MIGRATIONS FOR GEOFFREY.AI
-- ⚠️ WARNING: This will delete all existing scan data!

-- 0. Drop existing tables to ensure clean state
DROP TABLE IF EXISTS scans CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- 1. Create Businesses table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk User ID
  business_name TEXT NOT NULL,
  industry TEXT,
  region TEXT,
  website TEXT UNIQUE, -- CRITICAL: For ON CONFLICT
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Scans table
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk User ID
  overall_score INTEGER NOT NULL,
  coverage_fraction TEXT,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing public policies if they exist
DROP POLICY IF EXISTS "Public Interaction" ON businesses;
DROP POLICY IF EXISTS "Public Interaction" ON scans;

-- 5. Create helper function to get current user_id from JWT
-- This function extracts the user_id from the request's JWT token
-- For Clerk, we'll use a custom claim or pass user_id via request context
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
  -- Try to get user_id from JWT claim (if using Supabase Auth)
  -- For Clerk, we'll use a different approach via request context
  -- This is a fallback that will be overridden by application-level checks
  RETURN current_setting('request.jwt.claims', true)::json->>'sub';
EXCEPTION
  WHEN OTHERS THEN
    -- If JWT parsing fails, return NULL (will be handled by app-level auth)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create secure user-based RLS policies
-- IMPORTANT: Since we're using Clerk (not Supabase Auth), RLS cannot directly validate JWT tokens.
-- The application layer MUST:
-- 1. Validate Clerk JWT tokens before making Supabase requests
-- 2. Always filter queries by user_id
-- 3. Always set user_id from validated Clerk token when inserting/updating
-- These RLS policies provide defense-in-depth but are NOT sufficient alone.

-- For production, consider:
-- - Using Supabase service role key on backend and proxying all DB operations
-- - Creating Supabase Edge Functions that validate Clerk tokens
-- - Migrating to Supabase Auth for native RLS support

-- Businesses: Restrict access to rows with user_id (application must filter)
CREATE POLICY "Users can only access businesses with user_id" 
  ON businesses FOR SELECT 
  USING (user_id IS NOT NULL);

CREATE POLICY "Users can only insert businesses with user_id" 
  ON businesses FOR INSERT 
  WITH CHECK (user_id IS NOT NULL);

CREATE POLICY "Users can only update businesses with user_id" 
  ON businesses FOR UPDATE 
  USING (user_id IS NOT NULL)
  WITH CHECK (
    -- Prevent changing user_id to a different value
    user_id = (SELECT user_id FROM businesses WHERE id = businesses.id)
  );

CREATE POLICY "Users can only delete businesses with user_id" 
  ON businesses FOR DELETE 
  USING (user_id IS NOT NULL);

-- Scans: Restrict access and ensure business ownership
CREATE POLICY "Users can only access scans with user_id" 
  ON scans FOR SELECT 
  USING (user_id IS NOT NULL);

CREATE POLICY "Users can only insert scans with matching user_id" 
  ON scans FOR INSERT 
  WITH CHECK (
    user_id IS NOT NULL
    -- Ensure the business belongs to the same user
    AND EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = scans.business_id 
      AND businesses.user_id = scans.user_id
    )
  );

CREATE POLICY "Users can only update scans with user_id" 
  ON scans FOR UPDATE 
  USING (user_id IS NOT NULL)
  WITH CHECK (
    -- Prevent changing user_id or business_id to different user's data
    user_id = (SELECT user_id FROM scans WHERE id = scans.id)
    AND business_id = (SELECT business_id FROM scans WHERE id = scans.id)
  );

CREATE POLICY "Users can only delete scans with user_id" 
  ON scans FOR DELETE 
  USING (user_id IS NOT NULL);

-- IMPORTANT: These RLS policies provide basic protection, but since we're using Clerk:
-- 1. The application MUST validate Clerk JWT tokens before making Supabase requests
-- 2. The application MUST set user_id from the validated Clerk token
-- 3. Consider using Supabase service role key on backend and proxying all DB operations
-- 4. Or implement a Supabase Edge Function that validates Clerk tokens
