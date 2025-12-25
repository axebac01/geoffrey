import express, { Request, Response } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger';

const router = express.Router();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/onboarding/status
 * Get user's onboarding status
 */
router.get('/status', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;

    try {
        let { data: onboarding, error } = await supabase
            .from('user_onboarding')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // No onboarding record exists - create one
            const { data: newOnboarding, error: createError } = await supabase
                .from('user_onboarding')
                .insert({
                    user_id: userId,
                    current_step: 'company',
                    completed_steps: [],
                    is_complete: false
                })
                .select()
                .single();

            if (createError) throw createError;
            onboarding = newOnboarding;
        } else if (error) {
            throw error;
        }

        res.json({ onboarding });
    } catch (error: any) {
        logger.error('Failed to fetch onboarding status', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to fetch onboarding status' });
    }
});

/**
 * PATCH /api/onboarding/status
 * Update user's onboarding progress
 */
router.patch('/status', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { currentStep, completedSteps, isComplete } = req.body;

    try {
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (currentStep) updateData.current_step = currentStep;
        if (completedSteps) updateData.completed_steps = completedSteps;
        if (isComplete !== undefined) {
            updateData.is_complete = isComplete;
            if (isComplete) {
                updateData.completed_at = new Date().toISOString();
            }
        }

        const { data: onboarding, error } = await supabase
            .from('user_onboarding')
            .upsert({
                user_id: userId,
                ...updateData
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ onboarding });
    } catch (error: any) {
        logger.error('Failed to update onboarding status', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to update onboarding status' });
    }
});

/**
 * GET /api/onboarding/next-step
 * Get the next step user should be on based on their progress
 */
router.get('/next-step', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;

    try {
        let { data: onboarding, error } = await supabase
            .from('user_onboarding')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // New user - start at company step
            res.json({ nextStep: 'company', isComplete: false });
            return;
        } else if (error) {
            throw error;
        }

        if (onboarding.is_complete) {
            res.json({ nextStep: null, isComplete: true });
            return;
        }

        // Determine next step based on completed steps
        const completedSteps = onboarding.completed_steps || [];
        let nextStep = 'company';

        if (!completedSteps.includes('company')) {
            nextStep = 'company';
        } else if (!completedSteps.includes('scanning')) {
            nextStep = 'scanning';
        } else if (!completedSteps.includes('review')) {
            nextStep = 'review';
        } else {
            // All steps completed - mark as complete
            // Update database if not already marked
            if (!onboarding.is_complete) {
                await supabase
                    .from('user_onboarding')
                    .update({ is_complete: true, current_step: 'completed' })
                    .eq('user_id', userId);
            }
            res.json({ nextStep: null, isComplete: true });
            return;
        }

        res.json({ nextStep, isComplete: false });
    } catch (error: any) {
        logger.error('Failed to get next step', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to get next step' });
    }
});

/**
 * POST /api/onboarding/scan-result
 * Save scan result for user (replaces sessionStorage)
 */
router.post('/scan-result', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { scanData } = req.body;

    if (!scanData) {
        return res.status(400).json({ error: 'scanData is required' });
    }

    try {
        // Delete any existing scan results for this user
        await supabase
            .from('onboarding_scan_results')
            .delete()
            .eq('user_id', userId);

        // Insert new scan result
        const { data: scanResult, error } = await supabase
            .from('onboarding_scan_results')
            .insert({
                user_id: userId,
                scan_data: scanData
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ scanResult });
    } catch (error: any) {
        logger.error('Failed to save scan result', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to save scan result' });
    }
});

/**
 * GET /api/onboarding/scan-result
 * Get scan result for user
 */
router.get('/scan-result', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;

    try {
        const { data: scanResult, error } = await supabase
            .from('onboarding_scan_results')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code === 'PGRST116') {
            // No scan result found
            res.json({ scanResult: null });
            return;
        }

        if (error) throw error;

        res.json({ scanResult });
    } catch (error: any) {
        logger.error('Failed to fetch scan result', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to fetch scan result' });
    }
});

/**
 * POST /api/onboarding/company-data
 * Save company data for user (replaces sessionStorage)
 * Stores in onboarding_scan_results as temporary data
 */
router.post('/company-data', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { companyName, website } = req.body;

    if (!website) {
        return res.status(400).json({ error: 'website is required' });
    }

    try {
        // Store company data temporarily in onboarding_scan_results
        // Delete any existing temporary company data
        await supabase
            .from('onboarding_scan_results')
            .delete()
            .eq('user_id', userId);

        // Insert company data
        const { data: companyData, error } = await supabase
            .from('onboarding_scan_results')
            .insert({
                user_id: userId,
                scan_data: { companyName, website, type: 'company_data' }
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, companyData });
    } catch (error: any) {
        logger.error('Failed to save company data', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to save company data' });
    }
});

/**
 * GET /api/onboarding/company-data
 * Get company data for user
 */
router.get('/company-data', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;

    try {
        // Get company data from onboarding_scan_results
        const { data: companyData, error } = await supabase
            .from('onboarding_scan_results')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code === 'PGRST116') {
            res.json({ companyData: null });
            return;
        }

        if (error) throw error;

        // Check if it's company data (not scan result)
        if (companyData.scan_data?.type === 'company_data') {
            res.json({ companyData: companyData.scan_data });
        } else {
            res.json({ companyData: null });
        }
    } catch (error: any) {
        logger.error('Failed to fetch company data', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to fetch company data' });
    }
});

/**
 * POST /api/onboarding/reset
 * Reset onboarding for testing (deletes all onboarding data)
 */
router.post('/reset', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;

    try {
        // Delete all onboarding data
        await supabase.from('user_onboarding').delete().eq('user_id', userId);
        await supabase.from('onboarding_scan_results').delete().eq('user_id', userId);
        await supabase.from('onboarding_company_data').delete().eq('user_id', userId);

        res.json({ success: true });
    } catch (error: any) {
        logger.error('Failed to reset onboarding', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to reset onboarding' });
    }
});

export default router;

