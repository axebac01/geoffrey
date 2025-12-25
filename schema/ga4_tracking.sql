-- AI Click Tracking Schema for Geoffrey.ai
-- This adds GA4 integration and optional direct tracking

-- =====================================================
-- GA4 Integrations Table
-- Stores OAuth tokens and selected GA4 property
-- =====================================================
CREATE TABLE IF NOT EXISTS ga4_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE, -- Clerk User ID (one integration per user)
  provider TEXT NOT NULL DEFAULT 'ga4',
  
  -- GA4 Property Selection
  ga4_property_id TEXT, -- e.g., '123456789'
  ga4_property_display_name TEXT,
  
  -- OAuth Tokens (refresh_token MUST be encrypted at rest)
  refresh_token_encrypted TEXT NOT NULL,
  access_token TEXT, -- Can be null, will be refreshed
  access_token_expires_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_ga4_integrations_user_id ON ga4_integrations(user_id);

-- =====================================================
-- AI Click Events Table
-- For optional lightweight tracking script (no GA4 needed)
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Site owner's Clerk User ID
  site_domain TEXT NOT NULL, -- e.g., 'example.com'
  
  -- Event Data
  ts TIMESTAMPTZ DEFAULT NOW(),
  referrer TEXT,
  landing_url TEXT NOT NULL,
  
  -- UTM Parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Privacy-preserving identifiers (hashed)
  user_agent_hash TEXT,
  ip_hash TEXT,
  
  -- AI Detection
  assistant_detected TEXT CHECK (assistant_detected IN ('chatgpt', 'gemini', 'perplexity', 'copilot', 'claude', 'other', NULL)),
  is_verified BOOLEAN DEFAULT FALSE, -- True if referrer matched AI list OR utm_source matched
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_ai_click_events_user_id ON ai_click_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_click_events_site_domain ON ai_click_events(site_domain);
CREATE INDEX IF NOT EXISTS idx_ai_click_events_ts ON ai_click_events(ts);
CREATE INDEX IF NOT EXISTS idx_ai_click_events_assistant ON ai_click_events(assistant_detected);

-- =====================================================
-- Site Tracking Keys Table
-- For validating the optional tracking script
-- =====================================================
CREATE TABLE IF NOT EXISTS site_tracking_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  site_domain TEXT NOT NULL,
  public_key TEXT NOT NULL UNIQUE, -- Public key for script authentication
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, site_domain)
);

CREATE INDEX IF NOT EXISTS idx_site_tracking_keys_public_key ON site_tracking_keys(public_key);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE ga4_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_tracking_keys ENABLE ROW LEVEL SECURITY;

-- GA4 Integrations: Users can only access their own integrations
CREATE POLICY "Users can only access own ga4_integrations" 
  ON ga4_integrations FOR ALL 
  USING (user_id IS NOT NULL);

-- AI Click Events: Users can only access their own events
CREATE POLICY "Users can only access own ai_click_events" 
  ON ai_click_events FOR ALL 
  USING (user_id IS NOT NULL);

-- Site Tracking Keys: Users can only access their own keys
CREATE POLICY "Users can only access own site_tracking_keys" 
  ON site_tracking_keys FOR ALL 
  USING (user_id IS NOT NULL);

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. refresh_token_encrypted MUST be encrypted using TOKEN_ENCRYPTION_KEY
-- 2. Never expose refresh_token to client
-- 3. Use secure cookies for OAuth state
-- 4. Implement rate limiting on /api/track endpoint
-- 5. ip_hash and user_agent_hash should use a salted hash

