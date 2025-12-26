import express, { Request, Response } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';
import { runResponder } from '../responder';
import { runJudge } from '../judge';
import { logger } from '../logger';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/prompts
 * List all prompts for the authenticated user
 */
router.get('/', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    
    try {
        const { data: prompts, error } = await supabase
            .from('prompts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ prompts: prompts || [] });
    } catch (error: any) {
        logger.error('Failed to fetch prompts', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to fetch prompts' });
    }
});

/**
 * POST /api/prompts
 * Create a new prompt
 */
router.post('/', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { promptText, keyword, intent, businessId } = req.body;

    if (!promptText) {
        res.status(400).json({ error: 'promptText is required' });
        return;
    }

    try {
        const { data: prompt, error } = await supabase
            .from('prompts')
            .insert({
                user_id: userId,
                business_id: businessId || null,
                prompt_text: promptText,
                keyword: keyword || null,
                intent: intent || 'informational',
                is_approved: true,
                is_from_onboarding: false
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ prompt });
    } catch (error: any) {
        logger.error('Failed to create prompt', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to create prompt' });
    }
});

/**
 * DELETE /api/prompts/:id
 * Delete a prompt
 */
router.delete('/:id', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('prompts')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error: any) {
        logger.error('Failed to delete prompt', { userId, promptId: id, error: error.message });
        res.status(500).json({ error: 'Failed to delete prompt' });
    }
});

/**
 * POST /api/prompts/:id/test
 * Run a single prompt test
 */
router.post('/:id/test', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { id } = req.params;
    const { businessName, industry, region } = req.body;

    try {
        // Get the prompt
        const { data: prompt, error: promptError } = await supabase
            .from('prompts')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (promptError || !prompt) {
            res.status(404).json({ error: 'Prompt not found' });
            return;
        }

        // Run responder
        const responderAnswer = await runResponder(prompt.prompt_text, 'openai');

        // Create snapshot for judge
        const snapshot = {
            businessName: businessName || 'Unknown',
            industry: industry || 'Unknown',
            region: region || 'Unknown',
            descriptionSpecs: []
        };

        // Run judge
        const judgeResult = await runJudge(responderAnswer, snapshot);

        // Store test result
        const { data: testResult, error: testError } = await supabase
            .from('prompt_tests')
            .insert({
                prompt_id: id,
                user_id: userId,
                business_id: prompt.business_id,
                is_mentioned: judgeResult.isMentioned,
                mention_type: judgeResult.mentionType,
                rank_position: judgeResult.rankPosition,
                industry_match: judgeResult.industryMatch,
                location_match: judgeResult.locationMatch,
                sentiment: judgeResult.sentiment,
                responder_answer: responderAnswer,
                result: {
                    judgeResult,
                    testedAt: new Date().toISOString()
                },
                model_used: 'openai'
            })
            .select()
            .single();

        if (testError) throw testError;

        res.json({
            test: testResult,
            responderAnswer,
            judgeResult
        });
    } catch (error: any) {
        logger.error('Failed to test prompt', { userId, promptId: id, error: error.message });
        res.status(500).json({ error: 'Failed to test prompt', details: error.message });
    }
});

/**
 * GET /api/prompts/:id/history
 * Get test history for a prompt
 */
router.get('/:id/history', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { id } = req.params;

    try {
        const { data: tests, error } = await supabase
            .from('prompt_tests')
            .select('*')
            .eq('prompt_id', id)
            .eq('user_id', userId)
            .order('tested_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        res.json({ tests: tests || [] });
    } catch (error: any) {
        logger.error('Failed to fetch prompt history', { userId, promptId: id, error: error.message });
        res.status(500).json({ error: 'Failed to fetch prompt history' });
    }
});

/**
 * POST /api/prompts/bulk
 * Create multiple prompts at once (for onboarding)
 */
router.post('/bulk', ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const { prompts, businessId } = req.body;

    if (!prompts || !Array.isArray(prompts)) {
        res.status(400).json({ error: 'prompts array is required' });
        return;
    }

    try {
        const promptsToInsert = prompts.map((p: any) => ({
            user_id: userId,
            business_id: businessId || null,
            prompt_text: typeof p === 'string' ? p : p.promptText || p.prompt,
            keyword: typeof p === 'string' ? null : p.keyword || null,
            intent: typeof p === 'string' ? 'informational' : p.intent || 'informational',
            quality_score: typeof p === 'string' ? null : p.qualityScore || null,
            is_approved: true,
            is_from_onboarding: true
        }));

        const { data: createdPrompts, error } = await supabase
            .from('prompts')
            .insert(promptsToInsert)
            .select();

        if (error) throw error;

        res.json({ prompts: createdPrompts });
    } catch (error: any) {
        logger.error('Failed to create bulk prompts', { userId, error: error.message });
        res.status(500).json({ error: 'Failed to create prompts' });
    }
});

export default router;


