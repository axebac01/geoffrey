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
        } else if (!completedSteps.includes('plan')) {
            nextStep = 'plan';
        } else {
            nextStep = 'completed';
        }

        res.json({ nextStep, isComplete: false });
    } catch (error: any) {
        logger.error('Failed to get next step', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to get next step' });
    }
});

export default router;

