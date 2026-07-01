export type AIProviderResult = {
  output: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  estimatedCostUsd?: number | null;
};
