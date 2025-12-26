import { analyzeVisibility } from "./index";
import { runGeoffreyGenerator } from "./generator";
import { EntitySnapshot } from "./types";
import dotenv from "dotenv";

dotenv.config();

// Example Data
const snapshot: EntitySnapshot = {
    businessName: "Malmö Car Center",
    industry: "Used Car Dealership",
    region: "Malmö, Sweden",
    website: "example.com",
    descriptionSpecs: [
        "Sells used cars",
        "Offers financing",
        "Family owned since 1990",
        "Located in central Malmö"
    ]
};

const prompts = [
    "Where can I buy a used car in Malmö?",
    "Best car dealers in Malmö for financing?",
];

async function main() {
    if (!process.env.OPENAI_API_KEY) {
        console.warn("⚠️  No OPENAI_API_KEY found. This script will likely fail or require a key.");
        console.warn("Please add OPENAI_API_KEY=... to your .env file.");
    }

    console.log("🚀 Starting Geoffrey MVP Test...");
    console.log("Target:", snapshot.businessName);

    try {
        // 1. Analyze Visibility
        console.log("\n--- Phase 1: Visibility Analysis ---");
        const result = await analyzeVisibility(snapshot, prompts);
        console.log("Score:", result.overallScore);
        console.log("Coverage:", result.coverageFraction);

        // 2. Generate Assets
        console.log("\n--- Phase 2: GEO Asset Generation ---");
        console.log("Generating FAQ and Schema...");
        const assets = await runGeoffreyGenerator(snapshot);

        console.log("\n✅ Generated FAQ JSON-LD Preview:");
        console.log(JSON.stringify(assets.faq.jsonLd, null, 2).slice(0, 300) + "...");

        console.log("\n✅ Generated About Snippet:");
        console.log(assets.aboutSnippet);

        console.log("\n✅ Generated Org Schema:");
        console.log(JSON.stringify(assets.orgSchema, null, 2));

    } catch (error) {
        console.error("❌ Process failed:", error);
    }
}

main();
