import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

export const config = {
    openaiApiKey: process.env.OPENAI_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
};

export const createOpenAIClient = () => {
    if (!config.openaiApiKey) {
        throw new Error("Missing OPENAI_API_KEY in environment variables.");
    }
    return new OpenAI({ apiKey: config.openaiApiKey });
};

import { GoogleGenerativeAI } from "@google/generative-ai";

export const createGeminiClient = () => {
    if (!config.geminiApiKey) {
        throw new Error("Missing GEMINI_API_KEY in environment variables.");
    }
    return new GoogleGenerativeAI(config.geminiApiKey);
};
