import { createGeminiClient } from "./config";

async function listModels() {
    try {
        const gemini = createGeminiClient();
        console.log("Fetching available models...");
        // Hack: The Google SDK doesn't expose listModels easily in the high-level client?
        // Let's try to just run a simple prompt against 'gemini-pro' and 'gemini-1.5-flash-latest' to see what sticks.

        const models = ["gemini-pro", "gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-1.0-pro"];

        for (const m of models) {
            process.stdout.write(`Testing model: ${m} ... `);
            try {
                const model = gemini.getGenerativeModel({ model: m });
                const result = await model.generateContent("Hello?");
                const response = await result.response;
                console.log(`✅ Success! Response: ${response.text().slice(0, 20)}...`);
            } catch (err: any) {
                console.log(`❌ Failed: ${err.message?.split('\n')[0]}`);
            }
        }
    } catch (e) {
        console.error("Setup error:", e);
    }
}

listModels();
