/**
 * WordPress Integration Routes
 * Handles OAuth flow, connection management, and content publishing
 */

import { Router, Request, Response } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';
import {
    getWordPressAuthUrl,
    exchangeCodeForTokens,
    refreshWordPressToken,
    encryptAccessToken,
    decryptAccessToken,
    testWordPressConnection,
    createWordPressPost,
    getWordPressSites,
    validateWordPressUrl,
    WordPressSiteType,
} from '../lib/wordpress';
import {
    formatBlogPostForWordPress,
    formatFAQFromGeoAssets,
} from '../lib/wordpress-content';
import { generateOAuthState } from '../lib/encryption';
import { logger } from '../logger';

const router = Router();

// Lazy-initialize Supabase client
let supabaseClient: any = null;

function getSupabase(): any {
    if (!supabaseClient) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_KEY;
        
        if (!url || !key) {
            throw new Error('WordPress integration requires SUPABASE_URL and SUPABASE_SERVICE_KEY');
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
 * GET /api/integrations/wordpress/connect
 * Start OAuth flow - redirects to WordPress.com consent screen or manual setup
 */
router.get('/connect', ClerkExpressRequireAuth() as any, (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const siteType = req.query.siteType as WordPressSiteType;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    if (!siteType || (siteType !== 'wordpress_com' && siteType !== 'self_hosted')) {
        res.status(400).json({ error: 'Invalid siteType. Must be "wordpress_com" or "self_hosted"' });
        return;
    }
    
    try {
        if (siteType === 'self_hosted') {
            // For self-hosted, redirect to manual setup page
            const isFetchRequest = req.headers.authorization;
            if (isFetchRequest) {
                res.json({ 
                    redirectUrl: '/dashboard/settings?wordpress=manual',
                    siteType: 'self_hosted'
                });
            } else {
                res.redirect('http://localhost:5173/dashboard/settings?wordpress=manual');
            }
            return;
        }
        
        // WordPress.com OAuth flow
        const state = generateOAuthState();
        oauthStateStore.set(state, { userId, createdAt: Date.now() });
        
        const authUrl = getWordPressAuthUrl(state);
        
        logger.info('WordPress OAuth initiated', { userId, siteType, authUrl: authUrl.substring(0, 50) + '...' });
        
        const isFetchRequest = req.headers.authorization;
        if (isFetchRequest) {
            res.json({ redirectUrl: authUrl });
        } else {
            res.redirect(authUrl);
        }
    } catch (error: any) {
        logger.error('Failed to start WordPress OAuth', { userId, siteType, error: error.message });
        
        const isFetchRequest = req.headers.authorization;
        if (isFetchRequest) {
            res.status(500).json({ error: 'OAuth configuration is missing' });
        } else {
            res.redirect('http://localhost:5173/dashboard/settings?error=wordpress_oauth_config_missing');
        }
    }
});

/**
 * GET /api/integrations/wordpress/callback
 * OAuth callback - exchanges code for tokens (WordPress.com only)
 */
router.get('/callback', async (req: Request, res: Response) => {
    const { code, state, error: oauthError } = req.query;
    
    logger.info('WordPress OAuth callback received', { 
        hasCode: !!code, 
        hasState: !!state, 
        oauthError: oauthError || null,
    });
    
    if (oauthError) {
        logger.warn('WordPress OAuth error', { error: oauthError });
        res.redirect('http://localhost:5173/dashboard/settings?error=wordpress_oauth_denied');
        return;
    }
    
    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        logger.warn('WordPress OAuth callback missing parameters', { 
            hasCode: !!code, 
            hasState: !!state,
        });
        res.redirect('http://localhost:5173/dashboard/settings?error=wordpress_oauth_invalid_request');
        return;
    }
    
    // Validate state
    const stateData = oauthStateStore.get(state);
    if (!stateData) {
        logger.warn('WordPress OAuth callback invalid state');
        res.redirect('http://localhost:5173/dashboard/settings?error=wordpress_oauth_state_expired');
        return;
    }
    
    oauthStateStore.delete(state);
    const { userId } = stateData;
    
    logger.info('WordPress OAuth callback state validated', { userId });
    
    try {
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);
        
        logger.info('WordPress OAuth tokens received', { 
            userId, 
            hasRefreshToken: !!tokens.refreshToken,
            hasAccessToken: !!tokens.accessToken,
            expiresAt: tokens.expiresAt.toISOString()
        });
        
        if (!tokens.accessToken || !tokens.refreshToken) {
            throw new Error('Failed to receive tokens from WordPress.com');
        }
        
        // Get user's sites to allow selection
        const sites = await getWordPressSites(tokens.accessToken);
        
        if (sites.length === 0) {
            throw new Error('No WordPress.com sites found');
        }
        
        // For now, use the first site (can be enhanced to allow selection)
        const selectedSite = sites[0];
        
        // Encrypt tokens
        const encryptedRefreshToken = encryptAccessToken(tokens.refreshToken);
        const encryptedAccessToken = encryptAccessToken(tokens.accessToken);
        
        // Store in database
        const supabase = getSupabase();
        const { data: savedData, error: dbError } = await supabase
            .from('wordpress_integrations')
            .upsert({
                user_id: userId,
                site_url: selectedSite.URL,
                site_type: 'wordpress_com',
                site_name: selectedSite.name,
                access_token_encrypted: encryptedAccessToken,
                refresh_token_encrypted: encryptedRefreshToken,
                token_expires_at: tokens.expiresAt.toISOString(),
                is_active: true,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,site_url',
            })
            .select();
        
        if (dbError) {
            logger.error('WordPress OAuth database error', { userId, error: dbError.message });
            throw new Error(`Database error: ${dbError.message}`);
        }
        
        logger.info('WordPress OAuth completed successfully', { userId, siteUrl: selectedSite.URL });
        
        res.redirect('http://localhost:5173/dashboard/settings?wordpress=connected');
    } catch (error: any) {
        logger.error('WordPress OAuth callback failed', { userId, error: error.message });
        res.redirect('http://localhost:5173/dashboard/settings?error=wordpress_oauth_failed');
    }
});

/**
 * POST /api/integrations/wordpress/connect/manual
 * Manual connection for self-hosted WordPress sites
 */
router.post('/connect/manual', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { siteUrl, applicationPassword, siteName } = req.body;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    if (!siteUrl || !applicationPassword) {
        res.status(400).json({ error: 'Missing siteUrl or applicationPassword' });
        return;
    }
    
    if (!validateWordPressUrl(siteUrl)) {
        res.status(400).json({ error: 'Invalid WordPress site URL' });
        return;
    }
    
    try {
        // Test connection
        const isConnected = await testWordPressConnection(siteUrl, applicationPassword, 'self_hosted');
        
        if (!isConnected) {
            res.status(400).json({ error: 'Failed to connect to WordPress site. Please check your URL and Application Password.' });
            return;
        }
        
        // Encrypt application password
        const encryptedPassword = encryptAccessToken(applicationPassword);
        
        // Store in database
        const supabase = getSupabase();
        const { data: savedData, error: dbError } = await supabase
            .from('wordpress_integrations')
            .upsert({
                user_id: userId,
                site_url: siteUrl,
                site_type: 'self_hosted',
                site_name: siteName || new URL(siteUrl).hostname,
                application_password_encrypted: encryptedPassword,
                is_active: true,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,site_url',
            })
            .select();
        
        if (dbError) {
            logger.error('WordPress manual connection database error', { userId, error: dbError.message });
            throw new Error(`Database error: ${dbError.message}`);
        }
        
        logger.info('WordPress manual connection successful', { userId, siteUrl });
        
        res.json({ 
            success: true, 
            integration: {
                id: savedData[0].id,
                siteUrl: savedData[0].site_url,
                siteName: savedData[0].site_name,
            }
        });
    } catch (error: any) {
        logger.error('WordPress manual connection failed', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to connect WordPress site', details: error.message });
    }
});

/**
 * GET /api/integrations/wordpress/status
 * Get connection status and list of connected sites
 */
router.get('/status', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    try {
        const supabase = getSupabase();
        const { data: integrations, error: dbError } = await supabase
            .from('wordpress_integrations')
            .select('id, site_url, site_type, site_name, is_active, created_at, updated_at')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (dbError) {
            throw new Error(`Database error: ${dbError.message}`);
        }
        
        res.json({
            connected: (integrations || []).length > 0,
            sites: (integrations || []).map((integration: any) => ({
                id: integration.id,
                siteUrl: integration.site_url,
                siteType: integration.site_type,
                siteName: integration.site_name,
                connectedAt: integration.created_at,
            })),
        });
    } catch (error: any) {
        logger.error('Failed to check WordPress status', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to check status' });
    }
});

/**
 * POST /api/integrations/wordpress/publish
 * Publish content to WordPress
 */
router.post('/publish', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { integrationId, contentType, geoAssetId, title, status } = req.body;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    if (!integrationId || !contentType || !geoAssetId) {
        res.status(400).json({ error: 'Missing required fields: integrationId, contentType, geoAssetId' });
        return;
    }
    
    if (contentType !== 'faq' && contentType !== 'blog_post') {
        res.status(400).json({ error: 'Invalid contentType. Must be "faq" or "blog_post"' });
        return;
    }
    
    try {
        const supabase = getSupabase();
        
        // Get WordPress integration
        const { data: integration, error: integrationError } = await supabase
            .from('wordpress_integrations')
            .select('*')
            .eq('id', integrationId)
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();
        
        if (integrationError || !integration) {
            res.status(404).json({ error: 'WordPress integration not found' });
            return;
        }
        
        // Get content from geo_assets
        const { data: asset, error: assetError } = await supabase
            .from('geo_assets')
            .select('*')
            .eq('id', geoAssetId)
            .eq('user_id', userId)
            .single();
        
        if (assetError || !asset) {
            res.status(404).json({ error: 'Content asset not found' });
            return;
        }
        
        // Get access token
        let accessToken: string;
        if (integration.site_type === 'wordpress_com') {
            // Decrypt and refresh if needed
            const encryptedToken = integration.access_token_encrypted;
            if (!encryptedToken) {
                throw new Error('No access token found');
            }
            
            // Check if token is expired
            const isExpired = integration.token_expires_at 
                ? new Date(integration.token_expires_at) < new Date()
                : true;
            
            if (isExpired) {
                // Refresh token
                const refreshed = await refreshWordPressToken(integration.refresh_token_encrypted);
                accessToken = refreshed.accessToken;
                
                // Update stored tokens
                await supabase
                    .from('wordpress_integrations')
                    .update({
                        access_token_encrypted: encryptAccessToken(refreshed.accessToken),
                        refresh_token_encrypted: encryptAccessToken(refreshed.refreshToken),
                        token_expires_at: refreshed.expiresAt.toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', integrationId);
            } else {
                accessToken = decryptAccessToken(encryptedToken);
            }
        } else {
            // Self-hosted: use application password
            accessToken = decryptAccessToken(integration.application_password_encrypted);
        }
        
        // Format content for WordPress
        let postData: any;
        
        if (contentType === 'faq') {
            // Get FAQ JSON-LD if available
            const { data: jsonLdAsset } = await supabase
                .from('geo_assets')
                .select('content_json')
                .eq('user_id', userId)
                .eq('asset_type', 'faq_jsonld')
                .single();
            
            const faqJsonLd = jsonLdAsset?.content_json || null;
            
            // Get business name for title
            const { data: business } = await supabase
                .from('businesses')
                .select('business_name')
                .eq('user_id', userId)
                .single();
            
            postData = formatFAQFromGeoAssets(
                asset.content_html || asset.content,
                faqJsonLd,
                business?.business_name
            );
        } else {
            // Blog post
            postData = formatBlogPostForWordPress(
                asset.content_html || asset.content,
                { title: title || asset.content?.substring(0, 50) }
            );
        }
        
        // Override title and status if provided
        if (title) {
            postData.title = title;
        }
        if (status) {
            postData.status = status;
        }
        
        // Create post in WordPress
        const wpResult = await createWordPressPost(
            integration.site_url,
            accessToken,
            integration.site_type as WordPressSiteType,
            postData
        );
        
        // Store published post reference
        const { data: publishedPost, error: postError } = await supabase
            .from('wordpress_posts')
            .insert({
                user_id: userId,
                wordpress_integration_id: integrationId,
                wordpress_post_id: wpResult.id,
                wordpress_post_url: wpResult.link,
                content_type: contentType,
                geo_asset_id: geoAssetId,
                title: postData.title,
                status: wpResult.status === 'publish' ? 'published' : 'draft',
                published_at: new Date().toISOString(),
            })
            .select()
            .single();
        
        if (postError) {
            logger.error('Failed to save WordPress post reference', { userId, error: postError.message });
            // Don't fail the request, post was created in WordPress
        }
        
        logger.info('WordPress post published', { 
            userId, 
            integrationId, 
            postId: wpResult.id,
            url: wpResult.link 
        });
        
        res.json({
            success: true,
            post: {
                id: wpResult.id,
                url: wpResult.link,
                status: wpResult.status,
            },
        });
    } catch (error: any) {
        logger.error('Failed to publish WordPress post', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to publish post', details: error.message });
    }
});

/**
 * GET /api/integrations/wordpress/posts
 * List published posts
 */
router.get('/posts', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    try {
        const supabase = getSupabase();
        const { data: posts, error: dbError } = await supabase
            .from('wordpress_posts')
            .select(`
                id,
                wordpress_post_id,
                wordpress_post_url,
                content_type,
                title,
                status,
                published_at,
                created_at,
                wordpress_integrations (
                    site_url,
                    site_name
                )
            `)
            .eq('user_id', userId)
            .order('published_at', { ascending: false });
        
        if (dbError) {
            throw new Error(`Database error: ${dbError.message}`);
        }
        
        res.json({ posts: posts || [] });
    } catch (error: any) {
        logger.error('Failed to list WordPress posts', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to list posts' });
    }
});

/**
 * DELETE /api/integrations/wordpress/:id
 * Disconnect WordPress site
 */
router.delete('/:id', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const integrationId = req.params.id;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    try {
        const supabase = getSupabase();
        const { error: dbError } = await supabase
            .from('wordpress_integrations')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', integrationId)
            .eq('user_id', userId);
        
        if (dbError) {
            throw new Error(`Database error: ${dbError.message}`);
        }
        
        logger.info('WordPress integration disconnected', { userId, integrationId });
        res.json({ success: true });
    } catch (error: any) {
        logger.error('Failed to disconnect WordPress', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});

export default router;

