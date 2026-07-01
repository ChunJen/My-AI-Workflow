import type { WorkflowType } from "@/types/workflow";
import { getPromptTemplate } from "./prompts";
import { callAI } from "./providers/anthropic";
import { callOpenAI } from "./providers/openai";
import { callGemini } from "./providers/gemini";

export type AIProvider = "ANTHROPIC" | "OPENAI" | "GEMINI";

export async function runWorkflow(
  type: WorkflowType,
  input: string,
  provider: AIProvider = "ANTHROPIC"
): Promise<string> {
  const template = getPromptTemplate(type);

  switch (provider) {
    case "ANTHROPIC":
      return callAI(template.system, template.user(input));
    case "OPENAI":
      return callOpenAI(template.system, template.user(input));
    case "GEMINI":
      return callGemini(template.system, template.user(input));
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
