# Google Analytics 4 Integration Setup

This guide explains how to set up the GA4 integration for AI Click Tracking in Geoffrey.ai.

## Overview

Geoffrey.ai can track visitors coming from AI assistants (ChatGPT, Gemini, Perplexity, etc.) using two methods:

1. **GA4 Integration (Recommended)** - Connect your existing Google Analytics 4 property
2. **Direct Tracking Script (Optional)** - Lightweight script for sites without GA4

## 1. Google Cloud Setup

### Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Note your Project ID

### Enable Required APIs

Enable these APIs in your project:

- **Google Analytics Data API** - For fetching reports
- **Google Analytics Admin API** - For listing properties

Go to: APIs & Services → Enable APIs and Services → Search and enable each API

### Configure OAuth Consent Screen

1. Go to: APIs & Services → OAuth consent screen
2. Choose "External" user type
3. Fill in required fields:
   - App name: "Geoffrey.ai"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/analytics.readonly`
5. Add test users (your email) during development
6. Submit for verification when ready for production

### Create OAuth Client

1. Go to: APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Configure:
   - Name: "Geoffrey.ai Web Client"
   - Authorized redirect URIs:
     - Development: `http://localhost:3000/api/integrations/ga4/callback`
     - Production: `https://your-domain.com/api/integrations/ga4/callback`
5. Save your **Client ID** and **Client Secret**

## 2. Environment Variables

Add these to your `.env` file:

```bash
# Google OAuth (Required for GA4 integration)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/integrations/ga4/callback

# Token Encryption (Required - generate a random 32-byte key)
# Generate with: openssl rand -hex 32
TOKEN_ENCRYPTION_KEY=your-64-character-hex-string

# Application Base URL
APP_BASE_URL=http://localhost:3000

# Supabase (for storing integrations)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
```

### Generate TOKEN_ENCRYPTION_KEY

```bash
# Using OpenSSL
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Database Setup

Run the migrations in `schema/ga4_tracking.sql` against your Supabase database:

```sql
-- Tables created:
-- - ga4_integrations (stores OAuth tokens and property selection)
-- - ai_click_events (stores direct tracking events)
-- - site_tracking_keys (stores public keys for tracking script)
```

## 4. API Endpoints

### GA4 Integration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations/ga4/connect` | Start OAuth flow |
| GET | `/api/integrations/ga4/callback` | OAuth callback |
| GET | `/api/integrations/ga4/properties` | List available GA4 properties |
| POST | `/api/integrations/ga4/property` | Save selected property |
| GET | `/api/integrations/ga4/status` | Check integration status |
| DELETE | `/api/integrations/ga4/disconnect` | Remove integration |

### Metrics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics/ai-clicks?start=YYYY-MM-DD&end=YYYY-MM-DD` | Fetch AI traffic data |
| GET | `/api/metrics/ai-clicks/summary` | Quick summary for dashboard |

### Direct Tracking Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/t.js` | Tracking script |
| POST | `/api/track` | Receive tracking events |
| POST | `/api/tracking/sites` | Create tracking site |
| GET | `/api/tracking/sites` | List tracking sites |
| DELETE | `/api/tracking/sites/:id` | Delete tracking site |

## 5. Tracked AI Sources

The system detects traffic from these AI assistants:

| Assistant | Detection Patterns |
|-----------|-------------------|
| ChatGPT | chat.openai.com, chatgpt.com |
| Gemini | gemini.google.com, bard.google.com |
| Perplexity | perplexity.ai |
| Copilot | copilot.microsoft.com |
| Claude | claude.ai, anthropic.com |
| You.com | you.com |
| Phind | phind.com |
| Poe | poe.com |

## 6. User Flow

### Connecting GA4

1. User clicks "Connect GA4" in Settings
2. Redirected to Google OAuth consent screen
3. After authorization, redirected to property selection
4. User selects GA4 property
5. AI Traffic data appears in dashboard

### Using Direct Tracking

1. User adds their domain in Settings
2. System generates a tracking script
3. User adds script to their website's `<head>`
4. AI-referred clicks are automatically tracked

## 7. Security Considerations

- **Refresh tokens are encrypted** at rest using AES-256-GCM
- **OAuth state** uses cryptographically random values
- **IP addresses and user agents** are hashed before storage
- **Rate limiting** prevents abuse of tracking endpoint
- **Bot filtering** ignores common crawler user agents
- **Domain validation** ensures tracking key matches site

## 8. Troubleshooting

### "No refresh token received"
- User may have already authorized the app
- Have them revoke access at [Google Account Permissions](https://myaccount.google.com/permissions)
- Try connecting again with `prompt=consent`

### "Invalid tracking key"
- Verify the `data-key` attribute matches the generated key
- Check if the site is active in Settings

### Properties not loading
- Verify GA4 is properly set up for the Google account
- Check that the Analytics Admin API is enabled
- Ensure the OAuth scope includes `analytics.readonly`

## 9. Production Checklist

- [ ] OAuth consent screen verified by Google
- [ ] Production redirect URI added to OAuth client
- [ ] TOKEN_ENCRYPTION_KEY is unique and secure
- [ ] SUPABASE_SERVICE_KEY has appropriate permissions
- [ ] Rate limiting configured for production load
- [ ] Error monitoring set up (Sentry, etc.)

