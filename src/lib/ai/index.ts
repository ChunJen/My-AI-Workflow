import { getPromptTemplate } from "./prompts";
import { callAI } from "./providers/anthropic";
import { callOpenAI } from "./providers/openai";
import { callGemini } from "./providers/gemini";
import type { AIProviderResult } from "./types";

export type AIProvider = "ANTHROPIC" | "OPENAI" | "GEMINI";
export type { AIProviderResult };

export async function runWorkflow(
  systemPrompt: string,
  userPrompt: string,
  provider: AIProvider = "ANTHROPIC"
): Promise<AIProviderResult> {
  switch (provider) {
    case "ANTHROPIC":
      return callAI(systemPrompt, userPrompt);
    case "OPENAI":
      return callOpenAI(systemPrompt, userPrompt);
    case "GEMINI":
      return callGemini(systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function runWorkflowByType(
  type: string,
  input: string,
  provider: AIProvider = "ANTHROPIC",
  configOverride?: { systemPrompt: string; userPromptTemplate: string }
): Promise<AIProviderResult> {
  let systemPrompt: string;
  let userPrompt: string;

  if (configOverride) {
    systemPrompt = configOverride.systemPrompt;
    userPrompt = configOverride.userPromptTemplate.replace(/\{\{input\}\}/g, input);
  } else {
    const template = getPromptTemplate(type);
    if (!template) throw new Error(`No prompt template for type: ${type}`);
    systemPrompt = template.system;
    userPrompt = template.user(input);
  }

  return runWorkflow(systemPrompt, userPrompt, provider);
}
