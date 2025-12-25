import express, { Request, Response } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';
import { generateFAQ, generateAbout, generateOrganizationSchema } from '../generator';
import { logger } from '../logger';
import { EntitySnapshot } from '../types';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/geo/assets
 * Get all GEO assets for the user
 */
router.get('/assets', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;

    try {
        const { data: assets, error } = await supabase
            .from('geo_assets')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('generated_at', { ascending: false });

        if (error) throw error;

        res.json({ assets: assets || [] });
    } catch (error: any) {
        logger.error('Failed to fetch GEO assets', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to fetch GEO assets' });
    }
});

/**
 * POST /api/geo/generate/faq
 * Generate FAQ content and schema
 */
router.post('/generate/faq', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { snapshot, businessId } = req.body;

    if (!snapshot) {
        res.status(400).json({ error: 'snapshot is required' });
        return;
    }

    try {
        logger.info('Generating FAQ', { userId, businessName: snapshot.businessName });
        
        const faq = await generateFAQ(snapshot as EntitySnapshot);

        // Store FAQ content
        const { data: faqAsset, error: faqError } = await supabase
            .from('geo_assets')
            .upsert({
                user_id: userId,
                business_id: businessId || null,
                asset_type: 'faq',
                content: faq.markdown,
                content_html: faq.html,
                content_json: { items: faq.items },
                is_active: true,
                generated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,asset_type'
            })
            .select()
            .single();

        // Store FAQ JSON-LD
        const { data: jsonLdAsset, error: jsonLdError } = await supabase
            .from('geo_assets')
            .upsert({
                user_id: userId,
                business_id: businessId || null,
                asset_type: 'faq_jsonld',
                content: JSON.stringify(faq.jsonLd, null, 2),
                content_json: faq.jsonLd,
                is_active: true,
                generated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,asset_type'
            })
            .select()
            .single();

        // Update checklist
        await updateChecklist(userId, 'faq_generated', true);

        res.json({
            faq: {
                markdown: faq.markdown,
                html: faq.html,
                jsonLd: faq.jsonLd,
                items: faq.items
            }
        });
    } catch (error: any) {
        logger.error('Failed to generate FAQ', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to generate FAQ', details: error.message });
    }
});

/**
 * POST /api/geo/generate/schema
 * Generate Organization/LocalBusiness schema
 */
router.post('/generate/schema', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { snapshot, businessId } = req.body;

    if (!snapshot) {
        res.status(400).json({ error: 'snapshot is required' });
        return;
    }

    try {
        logger.info('Generating schema', { userId, businessName: snapshot.businessName });
        
        const orgSchema = generateOrganizationSchema(snapshot as EntitySnapshot);

        // Store schema
        const { error } = await supabase
            .from('geo_assets')
            .upsert({
                user_id: userId,
                business_id: businessId || null,
                asset_type: 'org_schema',
                content: JSON.stringify(orgSchema, null, 2),
                content_json: orgSchema,
                is_active: true,
                generated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,asset_type'
            });

        if (error) throw error;

        // Update checklist
        await updateChecklist(userId, 'schema_generated', true);

        res.json({ schema: orgSchema });
    } catch (error: any) {
        logger.error('Failed to generate schema', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to generate schema', details: error.message });
    }
});

/**
 * POST /api/geo/generate/about
 * Generate About snippet
 */
router.post('/generate/about', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { snapshot, businessId } = req.body;

    if (!snapshot) {
        res.status(400).json({ error: 'snapshot is required' });
        return;
    }

    try {
        logger.info('Generating about snippet', { userId, businessName: snapshot.businessName });
        
        const aboutSnippet = await generateAbout(snapshot as EntitySnapshot);

        // Store about snippet
        const { error } = await supabase
            .from('geo_assets')
            .upsert({
                user_id: userId,
                business_id: businessId || null,
                asset_type: 'about_snippet',
                content: aboutSnippet,
                is_active: true,
                generated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,asset_type'
            });

        if (error) throw error;

        res.json({ aboutSnippet });
    } catch (error: any) {
        logger.error('Failed to generate about snippet', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to generate about snippet', details: error.message });
    }
});

/**
 * GET /api/geo/checklist
 * Get user's checklist progress
 */
router.get('/checklist', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;

    try {
        let { data: checklist, error } = await supabase
            .from('checklist_progress')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // No checklist exists, create one
            const { data: newChecklist, error: createError } = await supabase
                .from('checklist_progress')
                .insert({ user_id: userId })
                .select()
                .single();

            if (createError) throw createError;
            checklist = newChecklist;
        } else if (error) {
            throw error;
        }

        res.json({ checklist });
    } catch (error: any) {
        logger.error('Failed to fetch checklist', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to fetch checklist' });
    }
});

/**
 * PATCH /api/geo/checklist
 * Update checklist item
 */
router.patch('/checklist', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { item, value } = req.body;

    try {
        await updateChecklist(userId, item, value);
        
        const { data: checklist, error } = await supabase
            .from('checklist_progress')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        res.json({ checklist });
    } catch (error: any) {
        logger.error('Failed to update checklist', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to update checklist' });
    }
});

// Helper function to update checklist
async function updateChecklist(userId: string, item: string, value: boolean) {
    const validItems = [
        'connected_ga4',
        'first_scan_completed',
        'first_prompt_tested',
        'faq_generated',
        'schema_generated',
        'improvements_viewed',
        'profile_completed'
    ];

    if (!validItems.includes(item)) {
        throw new Error(`Invalid checklist item: ${item}`);
    }

    // Upsert checklist with updated item
    const { error } = await supabase
        .from('checklist_progress')
        .upsert({
            user_id: userId,
            [item]: value,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id'
        });

    if (error) throw error;
}

export default router;

