/**
 * GA4 Integration Routes
 * Handles OAuth flow, property selection, and AI traffic metrics
 */

import { Router, Request, Response } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';
import {
    getAuthUrl,
    exchangeCodeForTokens,
    refreshAccessToken,
    listGA4Properties,
    fetchAITrafficData,
    encryptRefreshToken,
    isTokenExpired,
    classifyAssistant,
    AI_SOURCES,
} from '../lib/ga4';
import { generateOAuthState, hashWithSalt, generatePublicKey } from '../lib/encryption';
import { logger } from '../logger';

const router = Router();

// Lazy-initialize Supabase client
let supabaseClient: any = null;

function getSupabase(): any {
    if (!supabaseClient) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_KEY;
        
        if (!url || !key) {
            throw new Error('GA4 integration requires SUPABASE_URL and SUPABASE_SERVICE_KEY');
        }
        
        supabaseClient = createClient(url, key);
    }
    return supabaseClient;
}

// In-memory store for OAuth state (use Redis in production)
const oauthStateStore = new Map<string, { userId: string; createdAt: number }>();

// Clean up expired states (older than 10 minutes)
function cleanupExpiredStates() {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [state, data] of oauthStateStore.entries()) {
        if (data.createdAt < tenMinutesAgo) {
            oauthStateStore.delete(state);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredStates, 5 * 60 * 1000);

/**
 * GET /api/integrations/ga4/connect
 * Start OAuth flow - redirects to Google consent screen
 */
router.get('/connect', ClerkExpressRequireAuth() as any, (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    try {
        const state = generateOAuthState();
        oauthStateStore.set(state, { userId, createdAt: Date.now() });
        
        const authUrl = getAuthUrl(state);
        
        logger.info('GA4 OAuth initiated', { userId, authUrl: authUrl.substring(0, 50) + '...' });
        
        // Check if request is from fetch (has Authorization header) or direct navigation
        const isFetchRequest = req.headers.authorization;
        
        if (isFetchRequest) {
            // Return JSON with redirect URL for fetch requests
            res.json({ redirectUrl: authUrl });
        } else {
            // Direct redirect for browser navigation
            res.redirect(authUrl);
        }
    } catch (error: any) {
        logger.error('Failed to start GA4 OAuth', { userId, error: error.message });
        
        const isFetchRequest = req.headers.authorization;
        if (isFetchRequest) {
            res.status(500).json({ error: 'OAuth configuration is missing' });
        } else {
            res.redirect('/dashboard/settings?error=oauth_config_missing');
        }
    }
});

/**
 * GET /api/integrations/ga4/callback
 * OAuth callback - exchanges code for tokens
 */
router.get('/callback', async (req: Request, res: Response) => {
    const { code, state, error: oauthError } = req.query;
    
    logger.info('GA4 OAuth callback received', { 
        hasCode: !!code, 
        hasState: !!state, 
        oauthError: oauthError || null,
        stateValue: typeof state === 'string' ? state.substring(0, 10) + '...' : null
    });
    
    if (oauthError) {
        logger.warn('GA4 OAuth error from Google', { error: oauthError });
        // Use absolute redirect to frontend
        res.redirect('http://localhost:5173/dashboard/settings?error=oauth_denied');
        return;
    }
    
    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        logger.warn('GA4 OAuth callback missing parameters', { 
            hasCode: !!code, 
            hasState: !!state,
            codeType: typeof code,
            stateType: typeof state
        });
        res.redirect('http://localhost:5173/dashboard/settings?error=oauth_invalid_request');
        return;
    }
    
    // Validate state
    const stateData = oauthStateStore.get(state);
    if (!stateData) {
        logger.warn('GA4 OAuth callback invalid state', { 
            state: state.substring(0, 10) + '...',
            storeSize: oauthStateStore.size,
            availableStates: Array.from(oauthStateStore.keys()).map(s => s.substring(0, 10) + '...')
        });
        res.redirect('http://localhost:5173/dashboard/settings?error=oauth_state_expired');
        return;
    }
    
    oauthStateStore.delete(state);
    const { userId } = stateData;
    
    logger.info('GA4 OAuth callback state validated', { userId });
    
    try {
        logger.info('GA4 OAuth exchanging code for tokens', { userId });
        
        // Exchange code for tokens
        logger.info('GA4 OAuth exchanging code for tokens', { userId });
        const tokens = await exchangeCodeForTokens(code);
        
        logger.info('GA4 OAuth tokens received', { 
            userId, 
            hasRefreshToken: !!tokens.refreshToken,
            hasAccessToken: !!tokens.accessToken,
            expiresAt: tokens.expiresAt.toISOString()
        });
        
        if (!tokens.accessToken || !tokens.refreshToken) {
            logger.error('GA4 OAuth missing tokens', { 
                userId, 
                hasAccessToken: !!tokens.accessToken,
                hasRefreshToken: !!tokens.refreshToken
            });
            throw new Error('Failed to receive tokens from Google');
        }
        
        // Encrypt refresh token
        const encryptedRefreshToken = encryptRefreshToken(tokens.refreshToken);
        
        // Store in database (upsert)
        const supabase = getSupabase();
        logger.info('GA4 OAuth storing tokens in database', { userId });
        
        const { data: savedData, error: dbError } = await supabase
            .from('ga4_integrations')
            .upsert({
                user_id: userId,
                provider: 'ga4',
                refresh_token_encrypted: encryptedRefreshToken,
                access_token: tokens.accessToken,
                access_token_expires_at: tokens.expiresAt.toISOString(),
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            })
            .select();
        
        if (dbError) {
            logger.error('GA4 OAuth database error', { userId, error: dbError.message });
            throw new Error(`Database error: ${dbError.message}`);
        }
        
        logger.info('GA4 OAuth tokens saved successfully', { 
            userId, 
            savedAccessToken: !!savedData?.[0]?.access_token,
            savedRefreshToken: !!savedData?.[0]?.refresh_token_encrypted
        });
        
        logger.info('GA4 OAuth completed successfully', { userId });
        
        // Redirect to property selection (absolute URL to frontend)
        res.redirect('http://localhost:5173/dashboard/settings?step=select-property');
    } catch (error: any) {
        logger.error('GA4 OAuth callback failed', { userId, error: error.message, stack: error.stack });
        res.redirect('http://localhost:5173/dashboard/settings?error=oauth_failed');
    }
});

/**
 * GET /api/integrations/ga4/properties
 * List available GA4 properties for selection
 */
router.get('/properties', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    try {
        // Get stored tokens
        const supabase = getSupabase();
        const { data: integration, error: dbError } = await supabase
            .from('ga4_integrations')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (dbError || !integration) {
            res.status(404).json({ error: 'GA4 not connected. Please connect first.' });
            return;
        }
        
        let accessToken = integration.access_token;
        
        // Refresh token if expired
        if (isTokenExpired(integration.access_token_expires_at)) {
            const refreshed = await refreshAccessToken(integration.refresh_token_encrypted);
            accessToken = refreshed.accessToken;
            
            // Update stored token
            await getSupabase()
                .from('ga4_integrations')
                .update({
                    access_token: refreshed.accessToken,
                    access_token_expires_at: refreshed.expiresAt.toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId);
        }
        
        const properties = await listGA4Properties(accessToken);
        
        res.json({ properties });
    } catch (error: any) {
        logger.error('Failed to list GA4 properties', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to fetch properties', details: error.message });
    }
});

/**
 * POST /api/integrations/ga4/property
 * Save selected GA4 property
 */
router.post('/property', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { propertyId, displayName } = req.body;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    if (!propertyId) {
        res.status(400).json({ error: 'Missing propertyId' });
        return;
    }
    
    try {
        const { error: dbError } = await getSupabase()
            .from('ga4_integrations')
            .update({
                ga4_property_id: propertyId,
                ga4_property_display_name: displayName || null,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        
        if (dbError) {
            throw new Error(`Database error: ${dbError.message}`);
        }
        
        logger.info('GA4 property selected', { userId, propertyId });
        res.json({ success: true });
    } catch (error: any) {
        logger.error('Failed to save GA4 property', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to save property', details: error.message });
    }
});

/**
 * GET /api/integrations/ga4/status
 * Check GA4 integration status
 */
router.get('/status', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    try {
        const { data: integration, error: dbError } = await getSupabase()
            .from('ga4_integrations')
            .select('ga4_property_id, ga4_property_display_name, created_at, updated_at')
            .eq('user_id', userId)
            .single();
        
        if (dbError || !integration) {
            res.json({ connected: false });
            return;
        }
        
        res.json({
            connected: true,
            propertyConfigured: !!integration.ga4_property_id,
            propertyId: integration.ga4_property_id,
            propertyName: integration.ga4_property_display_name,
            connectedAt: integration.created_at,
        });
    } catch (error: any) {
        logger.error('Failed to check GA4 status', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to check status' });
    }
});

/**
 * DELETE /api/integrations/ga4/disconnect
 * Disconnect GA4 integration
 */
router.delete('/disconnect', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    try {
        const { error: dbError } = await getSupabase()
            .from('ga4_integrations')
            .delete()
            .eq('user_id', userId);
        
        if (dbError) {
            throw new Error(`Database error: ${dbError.message}`);
        }
        
        logger.info('GA4 disconnected', { userId });
        res.json({ success: true });
    } catch (error: any) {
        logger.error('Failed to disconnect GA4', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});

export default router;

