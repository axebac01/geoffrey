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

-- 4. Policies (Public for MVP)
CREATE POLICY "Public Interaction" ON businesses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Interaction" ON scans FOR ALL USING (true) WITH CHECK (true);
