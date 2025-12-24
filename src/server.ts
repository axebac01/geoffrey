import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { analyzeVisibility } from "./index";
import { runGeoffreyGenerator } from "./generator";
import { scanWebsite } from "./scanner";
import { EntitySnapshot } from "./types";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
    try {
        const { snapshot, prompts } = req.body;

        if (!snapshot || !prompts || !Array.isArray(prompts)) {
            res.status(400).json({ error: "Invalid request body. Expected snapshot and prompts array." });
            return;
        }

        console.log(`[API] Analyzing for: ${snapshot.businessName}`);
        const result = await analyzeVisibility(snapshot, prompts);

        res.json(result);
    } catch (error: any) {
        console.error("[API] Analyze error:", error);
        res.status(500).json({ error: "Failed to analyze visibility", details: error.message });
    }
});

/**
 * POST /api/generate
 * Body: { snapshot: EntitySnapshot }
 * PROTECTED: Requires Clerk Auth
 */
app.post("/api/generate", ClerkExpressRequireAuth() as any, async (req: Request, res: Response) => {
    try {
        const { snapshot } = req.body;

        if (!snapshot) {
            res.status(400).json({ error: "Invalid request body. Expected snapshot." });
            return;
        }

        console.log(`[API] Generating assets for: ${snapshot.businessName}`);
        const assets = await runGeoffreyGenerator(snapshot);

        res.json(assets);
    } catch (error: any) {
        console.error("[API] Generate error:", error);
        res.status(500).json({ error: "Failed to generate assets", details: error.message });
    }
});

/**
 * POST /api/scan-website
 * Body: { url: string }
 * PUBLIC: Initial scan is available without auth
 */
app.post("/api/scan-website", async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        if (!url) {
            res.status(400).json({ error: "Missing 'url' in body" });
            return;
        }

        const result = await scanWebsite(url);
        res.json(result);
    } catch (error: any) {
        console.error("[API] Scan error:", error);
        res.status(500).json({ error: "Failed to scan website", details: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n🚀 Geoffrey API Server running on http://localhost:${PORT}`);
    console.log(`   - POST /api/analyze (Protected)`);
    console.log(`   - POST /api/generate (Protected)`);
    console.log(`   - POST /api/scan-website (Public)`);
});
