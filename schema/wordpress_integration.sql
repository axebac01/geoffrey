-- WordPress Integration Schema for Geoffrey.ai
-- Stores WordPress site connections and OAuth tokens

-- =====================================================
-- WordPress Integrations Table
-- Stores OAuth tokens and site information
-- =====================================================
CREATE TABLE IF NOT EXISTS wordpress_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  site_url TEXT NOT NULL,
  site_type TEXT NOT NULL CHECK (site_type IN ('wordpress_com', 'self_hosted')),
  site_name TEXT,
  
  -- OAuth Tokens (encrypted for self-hosted, OAuth for WordPress.com)
  access_token TEXT, -- Encrypted for self-hosted, plain for WordPress.com (temporary)
  access_token_encrypted TEXT, -- Encrypted access token for self-hosted
  refresh_token_encrypted TEXT, -- Encrypted refresh token for WordPress.com
  token_expires_at TIMESTAMPTZ, -- For WordPress.com OAuth tokens
  
  -- Application Password (for self-hosted, encrypted)
  application_password_encrypted TEXT, -- For self-hosted WordPress sites
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one connection per user per site
  UNIQUE(user_id, site_url)
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_wordpress_integrations_user_id ON wordpress_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_wordpress_integrations_site_url ON wordpress_integrations(site_url);

-- =====================================================
-- WordPress Posts Table
-- Tracks published posts to WordPress
-- =====================================================
CREATE TABLE IF NOT EXISTS wordpress_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  wordpress_integration_id UUID REFERENCES wordpress_integrations(id) ON DELETE CASCADE,
  wordpress_post_id INTEGER, -- WordPress post ID from REST API
  wordpress_post_url TEXT,
  
  -- Content reference
  content_type TEXT NOT NULL CHECK (content_type IN ('faq', 'blog_post')),
  geo_asset_id UUID REFERENCES geo_assets(id) ON DELETE SET NULL,
  
  -- Post metadata
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'publish', 'failed')),
  error_message TEXT, -- Store error if publishing failed
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_wordpress_posts_user_id ON wordpress_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_wordpress_posts_integration_id ON wordpress_posts(wordpress_integration_id);
CREATE INDEX IF NOT EXISTS idx_wordpress_posts_geo_asset_id ON wordpress_posts(geo_asset_id);
CREATE INDEX IF NOT EXISTS idx_wordpress_posts_content_type ON wordpress_posts(content_type);
CREATE INDEX IF NOT EXISTS idx_wordpress_posts_status ON wordpress_posts(status);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE wordpress_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordpress_posts ENABLE ROW LEVEL SECURITY;

-- WordPress Integrations: Users can only access their own integrations
CREATE POLICY "Users can only access own wordpress_integrations" 
  ON wordpress_integrations FOR ALL 
  USING (user_id IS NOT NULL);

-- WordPress Posts: Users can only access their own posts
CREATE POLICY "Users can only access own wordpress_posts" 
  ON wordpress_posts FOR ALL 
  USING (user_id IS NOT NULL);

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. access_token_encrypted, refresh_token_encrypted, and application_password_encrypted
--    MUST be encrypted using TOKEN_ENCRYPTION_KEY
-- 2. Never expose tokens or passwords to client
-- 3. Use HTTPS for all WordPress site URLs
-- 4. Implement rate limiting on WordPress API calls
-- 5. access_token (plain) is only used temporarily during OAuth flow

