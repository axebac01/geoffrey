-- Onboarding and Core App Tables for Geoffrey.ai
-- Run this after migrations.sql

-- ============================================
-- 1. Prompts Table
-- Stores approved prompts from onboarding and user-added prompts
-- ============================================
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  keyword TEXT,
  prompt_text TEXT NOT NULL,
  intent TEXT CHECK (intent IN ('transactional', 'informational', 'comparative', 'conversational')),
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  is_approved BOOLEAN NOT NULL DEFAULT true,
  is_from_onboarding BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_business_id ON prompts(business_id);

-- ============================================
-- 2. Prompt Tests Table
-- Stores results of individual prompt tests
-- ============================================
CREATE TABLE IF NOT EXISTS prompt_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  -- Test result data
  is_mentioned BOOLEAN NOT NULL,
  mention_type TEXT CHECK (mention_type IN ('direct', 'alias', 'implied', 'none')),
  rank_position INTEGER,
  industry_match BOOLEAN,
  location_match BOOLEAN,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  -- Raw response for debugging
  responder_answer TEXT,
  -- Full result as JSON for flexibility
  result JSONB NOT NULL DEFAULT '{}',
  -- Metadata
  model_used TEXT DEFAULT 'openai',
  tested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prompt_tests_user_id ON prompt_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tests_prompt_id ON prompt_tests(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tests_tested_at ON prompt_tests(tested_at);

-- ============================================
-- 3. Checklist Progress Table
-- Stores gamified onboarding checklist progress per user
-- ============================================
CREATE TABLE IF NOT EXISTS checklist_progress (
  user_id TEXT PRIMARY KEY,
  -- Individual checklist items
  connected_ga4 BOOLEAN NOT NULL DEFAULT false,
  first_scan_completed BOOLEAN NOT NULL DEFAULT false,
  first_prompt_tested BOOLEAN NOT NULL DEFAULT false,
  faq_generated BOOLEAN NOT NULL DEFAULT false,
  schema_generated BOOLEAN NOT NULL DEFAULT false,
  improvements_viewed BOOLEAN NOT NULL DEFAULT false,
  profile_completed BOOLEAN NOT NULL DEFAULT false,
  -- JSON for additional/future items
  custom_items JSONB DEFAULT '{}',
  -- Progress tracking
  total_items INTEGER NOT NULL DEFAULT 7,
  completed_items INTEGER NOT NULL DEFAULT 0,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. GEO Assets Table
-- Stores generated GEO assets (FAQ, Schema, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS geo_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('faq', 'faq_jsonld', 'about_snippet', 'org_schema', 'local_business_schema')),
  content TEXT NOT NULL,
  content_html TEXT,
  content_json JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_geo_assets_user_id ON geo_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_geo_assets_business_id ON geo_assets(business_id);
CREATE INDEX IF NOT EXISTS idx_geo_assets_type ON geo_assets(asset_type);

-- ============================================
-- 5. Update businesses table for onboarding
-- ============================================
-- Add columns if they don't exist (using DO block for safety)
DO $$ 
BEGIN
    -- Add company_description JSONB column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'businesses' AND column_name = 'company_description') THEN
        ALTER TABLE businesses ADD COLUMN company_description JSONB;
    END IF;
    
    -- Add onboarding_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'businesses' AND column_name = 'onboarding_status') THEN
        ALTER TABLE businesses ADD COLUMN onboarding_status TEXT DEFAULT 'pending' 
            CHECK (onboarding_status IN ('pending', 'company_input', 'scanning', 'review', 'plan_selection', 'completed'));
    END IF;
    
    -- Add plan column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'businesses' AND column_name = 'plan') THEN
        ALTER TABLE businesses ADD COLUMN plan TEXT DEFAULT 'free'
            CHECK (plan IN ('free', 'basic', 'standard', 'pro'));
    END IF;
    
    -- Add subscription_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'businesses' AND column_name = 'subscription_status') THEN
        ALTER TABLE businesses ADD COLUMN subscription_status TEXT DEFAULT 'trial'
            CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'expired'));
    END IF;
    
    -- Add UNIQUE constraint on user_id if it doesn't exist
    -- This allows upsert to work with onConflict: 'user_id'
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'businesses_user_id_unique'
    ) THEN
        ALTER TABLE businesses ADD CONSTRAINT businesses_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- ============================================
-- 6. RLS Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can manage their own prompts" ON prompts;
DROP POLICY IF EXISTS "Users can manage their own prompt tests" ON prompt_tests;
DROP POLICY IF EXISTS "Users can manage their own checklist" ON checklist_progress;
DROP POLICY IF EXISTS "Users can manage their own geo assets" ON geo_assets;

-- Create policies
CREATE POLICY "Users can manage their own prompts" 
  ON prompts FOR ALL 
  USING (user_id IS NOT NULL);

CREATE POLICY "Users can manage their own prompt tests" 
  ON prompt_tests FOR ALL 
  USING (user_id IS NOT NULL);

CREATE POLICY "Users can manage their own checklist" 
  ON checklist_progress FOR ALL 
  USING (user_id IS NOT NULL);

CREATE POLICY "Users can manage their own geo assets" 
  ON geo_assets FOR ALL 
  USING (user_id IS NOT NULL);

-- ============================================
-- 7. Helper Functions
-- ============================================

-- Function to update checklist progress
CREATE OR REPLACE FUNCTION update_checklist_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Count completed items
  NEW.completed_items := 0;
  IF NEW.connected_ga4 THEN NEW.completed_items := NEW.completed_items + 1; END IF;
  IF NEW.first_scan_completed THEN NEW.completed_items := NEW.completed_items + 1; END IF;
  IF NEW.first_prompt_tested THEN NEW.completed_items := NEW.completed_items + 1; END IF;
  IF NEW.faq_generated THEN NEW.completed_items := NEW.completed_items + 1; END IF;
  IF NEW.schema_generated THEN NEW.completed_items := NEW.completed_items + 1; END IF;
  IF NEW.improvements_viewed THEN NEW.completed_items := NEW.completed_items + 1; END IF;
  IF NEW.profile_completed THEN NEW.completed_items := NEW.completed_items + 1; END IF;
  
  -- Calculate percentage
  NEW.progress_percentage := (NEW.completed_items::float / NEW.total_items::float * 100)::integer;
  
  -- Update timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating progress
DROP TRIGGER IF EXISTS trigger_update_checklist_progress ON checklist_progress;
CREATE TRIGGER trigger_update_checklist_progress
  BEFORE INSERT OR UPDATE ON checklist_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_checklist_progress();

-- ============================================
-- 8. User Onboarding Tracking Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_onboarding (
  user_id TEXT PRIMARY KEY,
  current_step TEXT NOT NULL DEFAULT 'company' 
    CHECK (current_step IN ('company', 'scanning', 'review', 'plan', 'completed')),
  completed_steps JSONB DEFAULT '[]', -- Array of completed step names
  is_complete BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);

-- Enable RLS
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can manage their own onboarding" ON user_onboarding;
CREATE POLICY "Users can manage their own onboarding" 
  ON user_onboarding FOR ALL 
  USING (user_id IS NOT NULL);

-- ============================================
-- 9. Onboarding Scan Results Table
-- Stores scan results during onboarding (replaces sessionStorage)
-- ============================================
CREATE TABLE IF NOT EXISTS onboarding_scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  scan_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_scan_results_user_id ON onboarding_scan_results(user_id);

-- Enable RLS
ALTER TABLE onboarding_scan_results ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can manage their own scan results" ON onboarding_scan_results;
CREATE POLICY "Users can manage their own scan results" 
  ON onboarding_scan_results FOR ALL 
  USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- ============================================
-- 10. Initial Data Setup
-- ============================================
-- No initial data needed - tables will be populated by the application

