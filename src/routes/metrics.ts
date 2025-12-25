/**
 * Metrics Routes
 * Handles AI click tracking and analytics
 */

import { Router, Request, Response } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';
import {
    refreshAccessToken,
    fetchAITrafficData,
    fetchAITrafficTimeSeries,
    isTokenExpired,
    classifyAssistant,
} from '../lib/ga4';
import { logger } from '../logger';

const router = Router();

// Lazy-initialize Supabase client
let supabaseClient: any = null;

function getSupabase(): any {
    if (!supabaseClient) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_KEY;
        
        if (!url || !key) {
            throw new Error('Metrics require SUPABASE_URL and SUPABASE_SERVICE_KEY');
        }
        
        supabaseClient = createClient(url, key);
    }
    return supabaseClient;
}

/**
 * GET /api/metrics/ai-clicks/timeseries
 * Fetch time-series data for AI traffic
 * NOTE: This must come BEFORE /ai-clicks to avoid route conflicts
 */
router.get('/ai-clicks/timeseries', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { start, end, groupBy } = req.query;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    // Default to last 28 days
    const endDate = typeof end === 'string' ? end : new Date().toISOString().split('T')[0];
    const startDate = typeof start === 'string' ? start : 
        new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const groupByValue = (typeof groupBy === 'string' && ['day', 'week', 'month'].includes(groupBy))
        ? groupBy as 'day' | 'week' | 'month'
        : 'day';
    
    try {
        // Get GA4 integration
        const { data: integration, error: dbError } = await getSupabase()
            .from('ga4_integrations')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (dbError || !integration || !integration.ga4_property_id) {
            res.json({
                dateRange: { start: startDate, end: endDate },
                groupBy: groupByValue,
                data: [],
            });
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
        
        // Fetch time-series data
        try {
            const timeSeriesData = await fetchAITrafficTimeSeries(
                accessToken,
                integration.ga4_property_id,
                startDate,
                endDate,
                groupByValue
            );
            
            res.json({
                dateRange: { start: startDate, end: endDate },
                groupBy: groupByValue,
                data: timeSeriesData,
            });
        } catch (ga4Error: any) {
            // Check if it's an authentication error - try to refresh token once more
            const isAuthError = ga4Error.message?.includes('invalid authentication') || 
                               ga4Error.message?.includes('Invalid Credentials') ||
                               ga4Error.message?.includes('Authentication failed') ||
                               (ga4Error as any).code === 401 ||
                               (ga4Error as any).status === 401;
            
            if (isAuthError) {
                logger.info('Token appears invalid, attempting refresh', { userId });
                try {
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
                    
                    // Retry the API call once
                    logger.info('Retrying GA4 API call after token refresh', { userId });
                    const timeSeriesData = await fetchAITrafficTimeSeries(
                        accessToken,
                        integration.ga4_property_id,
                        startDate,
                        endDate,
                        groupByValue
                    );
                    
                    res.json({
                        dateRange: { start: startDate, end: endDate },
                        groupBy: groupByValue,
                        data: timeSeriesData,
                    });
                    return;
                } catch (retryError: any) {
                    logger.error('Retry after token refresh also failed', { userId, error: retryError.message });
                }
            }
            
            // If we get here, return error response
            const errorMessage = isAuthError 
                ? 'Authentication failed. Please reconnect GA4 in Settings.'
                : ga4Error.message || 'Failed to fetch data from GA4';
            
            logger.error('Failed to fetch AI clicks time-series', { userId, error: errorMessage });
            res.status(500).json({ error: 'Failed to fetch time-series data', details: errorMessage });
        }
    } catch (error: any) {
        logger.error('Failed to fetch AI clicks time-series', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to fetch time-series data', details: error.message });
    }
});

/**
 * GET /api/metrics/ai-clicks
 * Fetch verified AI clicks from GA4
 */
router.get('/ai-clicks', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { start, end } = req.query;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    // Default to last 28 days
    const endDate = typeof end === 'string' ? end : new Date().toISOString().split('T')[0];
    const startDate = typeof start === 'string' ? start : 
        new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    try {
        // Get GA4 integration
        const { data: integration, error: dbError } = await getSupabase()
            .from('ga4_integrations')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (dbError || !integration || !integration.ga4_property_id) {
            // Fall back to direct tracking data if available
            const directData = await fetchDirectTrackingData(userId, startDate, endDate);
            res.json({
                source: 'direct',
                ...directData,
            });
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
        
        // Fetch from GA4
        const ga4Data = await fetchAITrafficData(
            accessToken,
            integration.ga4_property_id,
            startDate,
            endDate
        );
        
        res.json({
            source: 'ga4',
            propertyId: integration.ga4_property_id,
            propertyName: integration.ga4_property_display_name,
            dateRange: { start: startDate, end: endDate },
            ...ga4Data,
        });
    } catch (error: any) {
        logger.error('Failed to fetch AI clicks', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to fetch AI traffic data', details: error.message });
    }
});

/**
 * GET /api/metrics/ai-clicks/summary
 * Quick summary for dashboard cards
 */
router.get('/ai-clicks/summary', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    // Last 7 days vs previous 7 days
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const prevEndDate = startDate;
    const prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    try {
        const { data: integration, error: dbError } = await getSupabase()
            .from('ga4_integrations')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (dbError || !integration || !integration.ga4_property_id) {
            logger.info('GA4 not configured for user', { userId, hasIntegration: !!integration });
            res.json({
                configured: false,
                sessions: 0,
                change: 0,
                topAssistant: null,
            });
            return;
        }
        
        logger.info('Fetching AI clicks summary', { 
            userId, 
            propertyId: integration.ga4_property_id,
            startDate,
            endDate
        });
        
        let accessToken = integration.access_token;
        let needsRefresh = false;
        
        // Check if token is missing or expired
        if (!accessToken || isTokenExpired(integration.access_token_expires_at)) {
            needsRefresh = true;
            logger.info('GA4 access token missing or expired, refreshing', { 
                userId, 
                hasToken: !!accessToken,
                expiresAt: integration.access_token_expires_at
            });
        }
        
        // Try to refresh token if needed
        if (needsRefresh) {
            try {
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
                
                logger.info('GA4 token refreshed successfully', { userId });
            } catch (tokenError: any) {
                logger.error('Failed to refresh GA4 token', { userId, error: tokenError.message });
                // Return configured but with zero data
                res.json({
                    configured: true,
                    sessions: 0,
                    activeUsers: 0,
                    change: 0,
                    topAssistant: null,
                    dateRange: { start: startDate, end: endDate },
                    error: 'Token refresh failed. Please reconnect GA4 in Settings.',
                });
                return;
            }
        }
        
        try {
            // Fetch current period
            logger.info('Fetching current period AI traffic', { userId, startDate, endDate });
            const current = await fetchAITrafficData(
                accessToken!,
                integration.ga4_property_id,
                startDate,
                endDate
            );
            
            // Fetch previous period
            logger.info('Fetching previous period AI traffic', { userId, prevStartDate, prevEndDate });
            const previous = await fetchAITrafficData(
                accessToken!,
                integration.ga4_property_id,
                prevStartDate,
                prevEndDate
            );
            
            const change = previous.totals.sessions > 0
                ? ((current.totals.sessions - previous.totals.sessions) / previous.totals.sessions) * 100
                : current.totals.sessions > 0 ? 100 : 0;
            
            logger.info('AI clicks summary fetched successfully', { 
                userId, 
                currentSessions: current.totals.sessions,
                previousSessions: previous.totals.sessions
            });
            
            res.json({
                configured: true,
                sessions: current.totals.sessions,
                activeUsers: current.totals.activeUsers,
                change: Math.round(change),
                topAssistant: current.byAssistant[0] || null,
                dateRange: { start: startDate, end: endDate },
            });
        } catch (ga4Error: any) {
            logger.error('GA4 API error when fetching AI traffic', { 
                userId, 
                error: ga4Error.message,
                propertyId: integration.ga4_property_id,
                stack: ga4Error.stack,
                errorCode: (ga4Error as any).code,
                errorStatus: (ga4Error as any).status
            });
            
            // Check if it's an authentication error - try to refresh token once more
            const isAuthError = ga4Error.message?.includes('invalid authentication') || 
                               ga4Error.message?.includes('Invalid Credentials') ||
                               ga4Error.message?.includes('Authentication failed') ||
                               (ga4Error as any).code === 401 ||
                               (ga4Error as any).status === 401;
            
            if (isAuthError && !needsRefresh) {
                // Token was valid according to expiry check, but API says it's invalid
                // Try refreshing once more
                logger.info('Token appears invalid despite expiry check, attempting refresh', { userId });
                try {
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
                    
                    // Retry the API call once
                    logger.info('Retrying GA4 API call after token refresh', { userId });
                    const current = await fetchAITrafficData(
                        accessToken,
                        integration.ga4_property_id,
                        startDate,
                        endDate
                    );
                    const previous = await fetchAITrafficData(
                        accessToken,
                        integration.ga4_property_id,
                        prevStartDate,
                        prevEndDate
                    );
                    
                    const change = previous.totals.sessions > 0
                        ? ((current.totals.sessions - previous.totals.sessions) / previous.totals.sessions) * 100
                        : current.totals.sessions > 0 ? 100 : 0;
                    
                    res.json({
                        configured: true,
                        sessions: current.totals.sessions,
                        activeUsers: current.totals.activeUsers,
                        change: Math.round(change),
                        topAssistant: current.byAssistant[0] || null,
                        dateRange: { start: startDate, end: endDate },
                    });
                    return;
                } catch (retryError: any) {
                    logger.error('Retry after token refresh also failed', { userId, error: retryError.message });
                }
            }
            
            // Return configured but with zero data and error message
            const errorMessage = isAuthError 
                ? 'Authentication failed. Please reconnect GA4 in Settings.'
                : ga4Error.message || 'Failed to fetch data from GA4';
            
            res.json({
                configured: true,
                sessions: 0,
                activeUsers: 0,
                change: 0,
                topAssistant: null,
                dateRange: { start: startDate, end: endDate },
                error: errorMessage,
            });
        }
    } catch (error: any) {
        logger.error('Failed to fetch AI clicks summary', { userId, error: error.message, stack: error.stack });
        // Return error response but don't crash
        res.json({
            configured: false,
            sessions: 0,
            change: 0,
            topAssistant: null,
            error: error.message || 'Unknown error',
        });
    }
});

/**
 * Fetch data from direct tracking (ai_click_events table)
 */
async function fetchDirectTrackingData(userId: string, startDate: string, endDate: string) {
    const { data: events, error } = await getSupabase()
        .from('ai_click_events')
        .select('*')
        .eq('user_id', userId)
        .gte('ts', startDate)
        .lte('ts', endDate + 'T23:59:59Z');
    
    if (error || !events) {
        return {
            totals: { sessions: 0, activeUsers: 0, keyEvents: 0 },
            byAssistant: [],
            breakdown: [],
        };
    }
    
    // Aggregate by assistant
    const assistantMap = new Map<string, number>();
    const uniqueUsers = new Set<string>();
    
    for (const event of events) {
        const assistant = event.assistant_detected || 'other';
        assistantMap.set(assistant, (assistantMap.get(assistant) || 0) + 1);
        if (event.ip_hash) uniqueUsers.add(event.ip_hash);
    }
    
    const byAssistant = Array.from(assistantMap.entries())
        .map(([assistant, sessions]) => ({
            assistant,
            sessions,
            activeUsers: 0, // Can't determine from our data
            keyEvents: 0,
        }))
        .sort((a, b) => b.sessions - a.sessions);
    
    return {
        totals: {
            sessions: events.length,
            activeUsers: uniqueUsers.size,
            keyEvents: 0,
        },
        byAssistant,
        breakdown: [],
    };
}

export default router;

