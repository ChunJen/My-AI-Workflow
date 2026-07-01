type ModelPricing = {
  inputPer1M: number;
  outputPer1M: number;
};

const PRICING: Record<string, ModelPricing> = {
  // Anthropic
  "claude-sonnet-4-6": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-sonnet-4-5": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-haiku-4-5-20251001": { inputPer1M: 0.8, outputPer1M: 4.0 },
  "claude-haiku-4-5": { inputPer1M: 0.8, outputPer1M: 4.0 },
  "claude-opus-4-8": { inputPer1M: 15.0, outputPer1M: 75.0 },
  "claude-opus-4-5": { inputPer1M: 15.0, outputPer1M: 75.0 },

  // OpenAI
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
  "gpt-4-turbo": { inputPer1M: 10.0, outputPer1M: 30.0 },
  "gpt-3.5-turbo": { inputPer1M: 0.5, outputPer1M: 1.5 },

  // Gemini
  "gemini-2.0-flash": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "gemini-2.0-flash-exp": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "gemini-1.5-flash": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-1.5-pro": { inputPer1M: 1.25, outputPer1M: 5.0 },
};

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const pricing = PRICING[model];
  if (!pricing) return null;
  const cost =
    (inputTokens / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
