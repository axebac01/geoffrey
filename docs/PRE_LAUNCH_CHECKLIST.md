# Pre-Launch Checklist

This document lists all development-only features and changes that **MUST** be made before going to production.

## 🚨 Critical - Must Fix Before Launch

### 1. Reset Onboarding Endpoint (Testing Only)
**Status:** ⚠️ Should be disabled or restricted in production

**Location:** `src/routes/onboarding.ts`

**Current Behavior:**
- `POST /api/onboarding/reset` - Allows users to reset their onboarding
- Accessible from Settings page

**Required Changes:**
- [ ] Add environment check: Only allow in development mode
- [ ] OR: Remove entirely and use database scripts for testing
- [ ] OR: Add admin-only authentication

**Files to Modify:**
- `src/routes/onboarding.ts` (add `if (process.env.NODE_ENV === 'production') return res.status(403)...`)
- `frontend/src/pages/dashboard/Settings.tsx` (hide reset button in production)

---

### 2. Hardcoded Localhost URLs
**Status:** ⚠️ Will break in production

**Locations:**
- `src/routes/ga4.ts` (lines 117, 128, 140, 207, 210)
- `frontend/src/pages/dashboard/Settings.tsx` (line 406)

**Current Behavior:**
- OAuth redirects use `http://localhost:5173`
- API calls use `http://localhost:3000`

**Required Changes:**
- [ ] Replace all `localhost` URLs with environment variables
- [ ] Set `APP_BASE_URL` and `FRONTEND_URL` in production environment
- [ ] Update Google Cloud Console OAuth redirect URIs

**Files to Modify:**
- `src/routes/ga4.ts` - Replace hardcoded URLs with `process.env.FRONTEND_URL`
- `frontend/src/pages/dashboard/Settings.tsx` - Use relative URLs or env variable
- `.env.production` - Add production URLs

**Example:**
```typescript
// Before:
res.redirect('http://localhost:5173/dashboard/settings?error=oauth_denied');

// After:
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
res.redirect(`${frontendUrl}/dashboard/settings?error=oauth_denied`);
```

---

## 🔒 Security & Configuration

### 3. Environment Variables
**Status:** ⚠️ Must be set in production

**Required Environment Variables:**
- [ ] `OPENAI_API_KEY` - OpenAI API key
- [ ] `SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_SERVICE_KEY` - Supabase service role key
- [ ] `CLERK_SECRET_KEY` - Clerk authentication secret
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- [ ] `GOOGLE_OAUTH_REDIRECT_URI` - Production OAuth redirect URI
- [ ] `APP_BASE_URL` - Production backend URL
- [ ] `FRONTEND_URL` - Production frontend URL

**Files to Check:**
- `.env.example` - Ensure all required variables are documented
- Production hosting platform (Vercel, Railway, etc.) - Set all variables

---

### 4. Google Cloud Console Configuration
**Status:** ⚠️ Must update OAuth settings

**Required Changes:**
- [ ] Add production redirect URI to Google Cloud Console
- [ ] Update authorized JavaScript origins
- [ ] Submit app for verification (if using sensitive scopes)
- [ ] Add production domain to authorized domains

**Current Development URI:**
- `http://localhost:3000/api/integrations/ga4/callback`

**Production URI Needed:**
- `https://yourdomain.com/api/integrations/ga4/callback`

---

### 5. Database Security
**Status:** ⚠️ Review RLS policies

**Required Checks:**
- [ ] Verify all tables have Row Level Security (RLS) enabled
- [ ] Review RLS policies for production access patterns
- [ ] Ensure service role key is NOT exposed to frontend
- [ ] Test that users can only access their own data

**Files to Review:**
- `schema/migrations.sql`
- `schema/onboarding.sql`
- `schema/ga4_tracking.sql`

---

## 🧪 Testing Features (Remove or Restrict)

### 6. Reset Onboarding Button
**Location:** `frontend/src/pages/dashboard/Settings.tsx`

**Current Behavior:**
- Visible in Profile tab
- Allows any user to reset their onboarding

**Required Changes:**
- [ ] Hide in production: `{process.env.NODE_ENV !== 'production' && (...)}`
- [ ] OR: Remove entirely and use database scripts for testing

---

### 7. Test CLI Script
**Location:** `src/test-cli.ts`

**Status:** ⚠️ Development tool only

**Action:**
- [ ] Document that this is for development only
- [ ] Consider moving to `scripts/` folder
- [ ] Add to `.gitignore` if contains sensitive test data

---

## 📝 Content & Copy Updates

### 8. Settings Page - Subscription Section
**Location:** `frontend/src/pages/dashboard/Settings.tsx`

**Current Behavior:**
- Shows "Free Trial - 7 days remaining" (hardcoded)
- "Manage Subscription (Coming Soon)" button disabled

**Required Changes:**
- [ ] Connect to actual subscription data from Stripe
- [ ] Implement subscription management
- [ ] Add cancel subscription functionality
- [ ] Show actual plan details and billing date

---

## 🔧 Configuration & Deployment

### 9. Vite Proxy Configuration
**Location:** `frontend/vite.config.ts`

**Current Behavior:**
- Proxies `/api` to `http://localhost:3000`

**Required Changes:**
- [ ] Update for production build
- [ ] Use environment variable for API URL
- [ ] Configure CORS properly for production domain

---

### 10. CORS Configuration
**Location:** `src/server.ts`

**Required Checks:**
- [ ] Review CORS settings for production domains
- [ ] Remove `localhost` from allowed origins in production
- [ ] Add production frontend URL to allowed origins

---

## 📊 Monitoring & Logging

### 11. Error Logging
**Status:** ⚠️ Ensure production logging is configured

**Required Checks:**
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure production logging levels
- [ ] Remove console.log statements or use proper logger
- [ ] Set up monitoring alerts

---

### 12. Analytics
**Status:** ⚠️ Add production analytics

**Required:**
- [ ] Add analytics tracking (if desired)
- [ ] Configure privacy-compliant analytics
- [ ] Add cookie consent if required (GDPR)

---

## ✅ Pre-Launch Testing Checklist

Before going live, test:

- [ ] Complete onboarding flow end-to-end
- [ ] GA4 OAuth connection with production URLs
- [ ] All API endpoints with production environment
- [ ] Database RLS policies
- [ ] Error handling and user feedback
- [ ] Mobile responsiveness
- [ ] Browser compatibility
- [ ] Performance (page load times, API response times)
- [ ] Security (test with different user accounts, verify data isolation)

---

## 📋 Quick Reference: Files That Need Changes

### High Priority (Blocking Launch)
1. `src/routes/ga4.ts` - Remove localhost URLs
2. `frontend/src/pages/dashboard/Settings.tsx` - Remove localhost, hide reset button
3. `src/routes/onboarding.ts` - Restrict reset endpoint

### Medium Priority (Should Fix)
4. Environment variables configuration
5. Google Cloud Console OAuth settings
6. CORS configuration

### Low Priority (Nice to Have)
7. Error logging setup
8. Analytics integration
9. Performance optimization

---

## 🚀 Deployment Steps

1. **Environment Setup**
   - Set all environment variables in hosting platform
   - Configure production database
   - Set up production Supabase project

2. **Code Changes**
   - Complete all items in "Critical - Must Fix" section
   - Test all changes in staging environment

3. **Third-Party Services**
   - Update Google Cloud Console OAuth settings
   - Set up error tracking

4. **Final Testing**
   - Run through complete user journey
   - Test with multiple accounts
   - Verify security and data isolation

5. **Launch**
   - Deploy to production
   - Monitor for errors
   - Have rollback plan ready

---

**Last Updated:** 2025-12-25  
**Status:** Development - Not Production Ready

