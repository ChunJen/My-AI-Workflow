import OpenAI from "openai";
import { estimateCost } from "../costs";
import type { AIProviderResult } from "../types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function callOpenAI(
  systemPrompt: string,
  userMessage: string
): Promise<AIProviderResult> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No content returned from OpenAI");

  const inputTokens = response.usage?.prompt_tokens;
  const outputTokens = response.usage?.completion_tokens;
  const totalTokens = response.usage?.total_tokens;

  return {
    output: content,
    model,
    usage: { inputTokens, outputTokens, totalTokens },
    estimatedCostUsd:
      inputTokens != null && outputTokens != null
        ? estimateCost(model, inputTokens, outputTokens)
        : null,
  };
}
