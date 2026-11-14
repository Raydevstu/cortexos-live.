import { GoogleGenAI } from "@google/genai";

// Server-side Gemini client with User-Agent telemetry
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy-key-for-build",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});
