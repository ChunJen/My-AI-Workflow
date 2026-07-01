import { GoogleGenerativeAI } from "@google/generative-ai";
import { estimateCost } from "../costs";
import type { AIProviderResult } from "../types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function callGemini(
  systemPrompt: string,
  userMessage: string
): Promise<AIProviderResult> {
  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  if (!text) throw new Error("No content returned from Gemini");

  const meta = result.response.usageMetadata;
  const inputTokens = meta?.promptTokenCount;
  const outputTokens = meta?.candidatesTokenCount;
  const totalTokens = meta?.totalTokenCount;

  return {
    output: text,
    model: modelName,
    usage: { inputTokens, outputTokens, totalTokens },
    estimatedCostUsd:
      inputTokens != null && outputTokens != null
        ? estimateCost(modelName, inputTokens, outputTokens)
        : null,
  };
}
