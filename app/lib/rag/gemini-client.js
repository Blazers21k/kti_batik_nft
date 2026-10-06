import { GoogleGenAI } from "@google/genai";

let clientInstance = null;

export const GEMINI_MODELS = Object.freeze({
  primary: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  fallback: process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite",
  embedding: "gemini-embedding-2",
});

export function getGeminiClient() {
  if (clientInstance) return clientInstance;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tidak ditemukan");
  clientInstance = new GoogleGenAI({ apiKey });
  return clientInstance;
}

export function isRetryableModelError(error) {
  const status = Number(error?.status || error?.code);
  if (status === 429 || status === 404 || status >= 500) return true;
  return /rate.?limit|quota|temporar|model.*(not found|unavailable)|\b(429|500|502|503|504)\b/i
    .test(String(error?.message || ""));
}
