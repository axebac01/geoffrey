/**
 * Tracking Routes
 * Handles the optional lightweight tracking script
 */

import { Router, Request, Response } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';
import { hashWithSalt, generatePublicKey } from '../lib/encryption';
import { classifyAssistant, AI_SOURCES } from '../lib/ga4';
import { logger } from '../logger';

const router = Router();

// Lazy-initialize Supabase client
let supabaseClient: any = null;

function getSupabase(): any {
    if (!supabaseClient) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_KEY;
        
        if (!url || !key) {
            throw new Error('Tracking requires SUPABASE_URL and SUPABASE_SERVICE_KEY');
        }
        
        supabaseClient = createClient(url, key);
    }
    return supabaseClient;
}

// Rate limiting (simple in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    
    if (!entry || entry.resetAt < now) {
        rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }
    
    if (entry.count >= maxRequests) {
        return false;
    }
    
    entry.count++;
    return true;
}

/**
 * GET /t.js
 * Serve the lightweight tracking script
 */
router.get('/t.js', (req: Request, res: Response) => {
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    
    const script = `
(function() {
    var d = document, w = window;
    var site = d.currentScript?.getAttribute('data-site') || '';
    var key = d.currentScript?.getAttribute('data-key') || '';
    
    if (!site || !key) return;
    
    // AI referrer patterns
    var aiPatterns = [
        /chat\\.openai\\.com/i,
        /chatgpt\\.com/i,
        /perplexity\\.ai/i,
        /gemini\\.google\\.com/i,
        /bard\\.google\\.com/i,
        /copilot\\.microsoft\\.com/i,
        /claude\\.ai/i,
        /anthropic\\.com/i,
        /you\\.com/i,
        /phind\\.com/i,
        /poe\\.com/i
    ];
    
    function isAIReferrer(ref) {
        if (!ref) return false;
        for (var i = 0; i < aiPatterns.length; i++) {
            if (aiPatterns[i].test(ref)) return true;
        }
        return false;
    }
    
    function getUTM() {
        var params = new URLSearchParams(w.location.search);
        return {
            source: params.get('utm_source') || null,
            medium: params.get('utm_medium') || null,
            campaign: params.get('utm_campaign') || null
        };
    }
    
    var ref = d.referrer || '';
    var utm = getUTM();
    
    // Only track if AI referrer or AI-related UTM source
    var isAI = isAIReferrer(ref) || 
               (utm.source && isAIReferrer(utm.source));
    
    if (!isAI) return;
    
    // Send tracking data
    var data = {
        key: key,
        site: site,
        ref: ref,
        url: w.location.href,
        utm: utm
    };
    
    // Use sendBeacon if available, otherwise fetch
    var endpoint = '${appBaseUrl}/api/track';
    if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, JSON.stringify(data));
    } else {
        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            keepalive: true
        }).catch(function() {});
    }
})();
`.trim();
    
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(script);
});

/**
 * POST /api/track
 * Receive tracking data from the script
 */
router.post('/track', async (req: Request, res: Response) => {
    const { key, site, ref, url, utm } = req.body;
    
    if (!key || !site) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }
    
    // Rate limit by IP
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
        res.status(429).json({ error: 'Too many requests' });
        return;
    }
    
    // Basic bot filtering
    const userAgent = req.headers['user-agent'] || '';
    if (/bot|crawler|spider|scraper/i.test(userAgent)) {
        res.status(200).json({ ok: true }); // Silently ignore bots
        return;
    }
    
    try {
        // Validate tracking key
        const { data: keyData, error: keyError } = await getSupabase()
            .from('site_tracking_keys')
            .select('user_id, site_domain, is_active')
            .eq('public_key', key)
            .single();
        
        if (keyError || !keyData || !keyData.is_active) {
            res.status(400).json({ error: 'Invalid tracking key' });
            return;
        }
        
        // Verify site matches
        const urlDomain = new URL(url).hostname.replace(/^www\./, '');
        const expectedDomain = keyData.site_domain.replace(/^www\./, '');
        if (urlDomain !== expectedDomain) {
            res.status(400).json({ error: 'Domain mismatch' });
            return;
        }
        
        // Detect AI assistant
        const referrer = ref || '';
        const utmSource = utm?.source || '';
        const assistantFromRef = classifyAssistant(referrer);
        const assistantFromUtm = classifyAssistant(utmSource);
        const assistant = assistantFromRef !== 'other' ? assistantFromRef : assistantFromUtm;
        
        // Check if verified (referrer matched AI list OR utm_source matched)
        const isVerified = AI_SOURCES.some(source => 
            referrer.toLowerCase().includes(source) || 
            utmSource.toLowerCase().includes(source)
        );
        
        // Hash sensitive data
        const ipHash = hashWithSalt(clientIp);
        const uaHash = hashWithSalt(userAgent);
        
        // Store event
        const { error: insertError } = await getSupabase()
            .from('ai_click_events')
            .insert({
                user_id: keyData.user_id,
                site_domain: keyData.site_domain,
                referrer: referrer || null,
                landing_url: url,
                utm_source: utm?.source || null,
                utm_medium: utm?.medium || null,
                utm_campaign: utm?.campaign || null,
                user_agent_hash: uaHash,
                ip_hash: ipHash,
                assistant_detected: assistant !== 'other' ? assistant : null,
                is_verified: isVerified,
            });
        
        if (insertError) {
            logger.error('Failed to store tracking event', { error: insertError.message });
        }
        
        res.status(200).json({ ok: true });
    } catch (error: any) {
        logger.error('Tracking error', { error: error.message });
        res.status(500).json({ error: 'Internal error' });
    }
});

/**
 * POST /api/tracking/sites
 * Create a new tracking site/key
 */
router.post('/sites', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { domain } = req.body;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    if (!domain) {
        res.status(400).json({ error: 'Missing domain' });
        return;
    }
    
    // Normalize domain
    const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    
    try {
        const publicKey = generatePublicKey();
        
        const { data, error } = await getSupabase()
            .from('site_tracking_keys')
            .upsert({
                user_id: userId,
                site_domain: normalizedDomain,
                public_key: publicKey,
                is_active: true,
            }, {
                onConflict: 'user_id,site_domain',
            })
            .select()
            .single();
        
        if (error) {
            throw new Error(error.message);
        }
        
        const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
        const scriptTag = `<script src="${appBaseUrl}/t.js" data-site="${normalizedDomain}" data-key="${data.public_key}"></script>`;
        
        res.json({
            domain: normalizedDomain,
            publicKey: data.public_key,
            scriptTag,
        });
    } catch (error: any) {
        logger.error('Failed to create tracking site', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to create tracking site' });
    }
});

/**
 * GET /api/tracking/sites
 * List user's tracking sites
 */
router.get('/sites', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    try {
        const { data, error } = await getSupabase()
            .from('site_tracking_keys')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            throw new Error(error.message);
        }
        
        const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
        
        const sites = (data || []).map((site: any) => ({
            id: site.id,
            domain: site.site_domain,
            publicKey: site.public_key,
            isActive: site.is_active,
            scriptTag: `<script src="${appBaseUrl}/t.js" data-site="${site.site_domain}" data-key="${site.public_key}"></script>`,
            createdAt: site.created_at,
        }));
        
        res.json({ sites });
    } catch (error: any) {
        logger.error('Failed to list tracking sites', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to list sites' });
    }
});

/**
 * DELETE /api/tracking/sites/:id
 * Delete a tracking site
 */
router.delete('/sites/:id', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { id } = req.params;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    try {
        const { error } = await getSupabase()
            .from('site_tracking_keys')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        
        if (error) {
            throw new Error(error.message);
        }
        
        res.json({ success: true });
    } catch (error: any) {
        logger.error('Failed to delete tracking site', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to delete site' });
    }
});

export default router;

