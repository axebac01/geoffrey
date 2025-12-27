import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { analyzeVisibility } from "./index";
import { runGeoffreyGenerator } from "./generator";
import { scanWebsite } from "./scanner";
import { EntitySnapshot } from "./types";
import { logger } from "./logger";

// Route imports
import ga4Routes from "./routes/ga4";
import metricsRoutes from "./routes/metrics";
import trackingRoutes from "./routes/tracking";
import promptsRoutes from "./routes/prompts";
import geoRoutes from "./routes/geo";
import userRoutes from "./routes/user";
import onboardingRoutes from "./routes/onboarding";
import wordpressRoutes from "./routes/wordpress";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());

// --- Route Modules ---
app.use("/api/integrations/ga4", ga4Routes);
app.use("/api/integrations/wordpress", wordpressRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/prompts", promptsRoutes);
app.use("/api/geo", geoRoutes);
app.use("/api/user", userRoutes);
app.use("/api/businesses", userRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/", trackingRoutes); // For /t.js

// --- Endpoints ---

// Health Check
app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", version: "1.0.0" });
});

/**
 * POST /api/analyze
 * Body: { snapshot: EntitySnapshot, prompts: string[] }
 * PROTECTED: Requires Clerk Auth
 */
app.post("/api/analyze", ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const startTime = Date.now();
    const userId = (req as any).auth?.userId;
    
    try {
        const { snapshot, prompts, competitors } = req.body;

        if (!snapshot || !prompts || !Array.isArray(prompts)) {
            logger.warn('Invalid analyze request', { userId, hasSnapshot: !!snapshot, hasPrompts: !!prompts });
            res.status(400).json({ error: "Invalid request body. Expected snapshot and prompts array." });
            return;
        }

        logger.logApiRequest('POST', '/api/analyze', userId);
        const competitorList = Array.isArray(competitors) ? competitors : [];
        const result = await analyzeVisibility(snapshot, prompts, competitorList);
        const duration = Date.now() - startTime;
        
        logger.logApiRequest('POST', '/api/analyze', userId, duration);
        res.json(result);
    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.logApiError('POST', '/api/analyze', 500, error, userId);
        res.status(500).json({ error: "Failed to analyze visibility", details: error.message });
    }
});

/**
 * POST /api/generate
 * Body: { snapshot: EntitySnapshot }
 * PROTECTED: Requires Clerk Auth
 */
app.post("/api/generate", ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    const startTime = Date.now();
    const userId = (req as any).auth?.userId;
    
    try {
        const { snapshot } = req.body;

        if (!snapshot) {
            logger.warn('Invalid generate request', { userId, hasSnapshot: !!snapshot });
            res.status(400).json({ error: "Invalid request body. Expected snapshot." });
            return;
        }

        logger.logApiRequest('POST', '/api/generate', userId);
        const assets = await runGeoffreyGenerator(snapshot);
        const duration = Date.now() - startTime;
        
        logger.logApiRequest('POST', '/api/generate', userId, duration);
        res.json(assets);
    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.logApiError('POST', '/api/generate', 500, error, userId);
        res.status(500).json({ error: "Failed to generate assets", details: error.message });
    }
});

/**
 * POST /api/scan-website
 * Body: { url: string }
 * PUBLIC: Initial scan is available without auth
 */
app.post("/api/scan-website", async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
        const { url } = req.body;
        if (!url) {
            logger.warn('Invalid scan-website request', { hasUrl: !!url });
            res.status(400).json({ error: "Missing 'url' in body" });
            return;
        }

        logger.logApiRequest('POST', '/api/scan-website');
        const result = await scanWebsite(url);
        const duration = Date.now() - startTime;
        
        logger.logApiRequest('POST', '/api/scan-website', undefined, duration);
        res.json(result);
    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.logApiError('POST', '/api/scan-website', 500, error);
        res.status(500).json({ error: "Failed to scan website", details: error.message });
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Geoffrey API Server running on http://0.0.0.0:${PORT}`);
    console.log(`   - POST /api/analyze (Protected)`);
    console.log(`   - POST /api/generate (Protected)`);
    console.log(`   - POST /api/scan-website (Public)`);
    console.log(`   - GET  /api/integrations/ga4/* (GA4 Integration)`);
    console.log(`   - GET  /api/integrations/wordpress/* (WordPress Integration)`);
    console.log(`   - GET  /api/metrics/ai-clicks (AI Traffic Metrics)`);
    console.log(`   - GET  /t.js (Tracking Script)`);
});
