import express, { Request, Response } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * DELETE /api/user/data
 * Delete all user data
 */
router.delete('/data', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;

    try {
        logger.warn('User data deletion requested', { userId });

        // Delete in order due to foreign key constraints
        
        // 1. Delete prompt tests
        await supabase
            .from('prompt_tests')
            .delete()
            .eq('user_id', userId);

        // 2. Delete prompts
        await supabase
            .from('prompts')
            .delete()
            .eq('user_id', userId);

        // 3. Delete GEO assets
        await supabase
            .from('geo_assets')
            .delete()
            .eq('user_id', userId);

        // 4. Delete AI click events
        await supabase
            .from('ai_click_events')
            .delete()
            .eq('user_id', userId);

        // 5. Delete site tracking keys
        await supabase
            .from('site_tracking_keys')
            .delete()
            .eq('user_id', userId);

        // 6. Delete GA4 integrations
        await supabase
            .from('ga4_integrations')
            .delete()
            .eq('user_id', userId);

        // 7. Delete checklist progress
        await supabase
            .from('checklist_progress')
            .delete()
            .eq('user_id', userId);

        // 8. Delete scans
        await supabase
            .from('scans')
            .delete()
            .eq('user_id', userId);

        // 9. Delete businesses
        await supabase
            .from('businesses')
            .delete()
            .eq('user_id', userId);

        logger.info('User data deleted successfully', { userId });

        res.json({ success: true, message: 'All data deleted successfully' });
    } catch (error: any) {
        logger.error('Failed to delete user data', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to delete user data' });
    }
});

/**
 * GET /api/user/profile
 * Get user's business profile
 */
router.get('/profile', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;

    try {
        const { data: business, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        res.json({ profile: business || null });
    } catch (error: any) {
        logger.error('Failed to fetch profile', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * POST /api/businesses
 * Create or update business profile
 */
router.post('/', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { businessName, industry, region, website, description, logoUrl, plan } = req.body;

    try {
        const { data: business, error } = await supabase
            .from('businesses')
            .upsert({
                user_id: userId,
                business_name: businessName,
                industry,
                region,
                website,
                description,
                logo_url: logoUrl,
                plan: plan || 'free',
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ business });
    } catch (error: any) {
        logger.error('Failed to save business', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to save business' });
    }
});

export default router;

