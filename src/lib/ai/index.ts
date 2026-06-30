import type { WorkflowType } from "@/types/workflow";
import { getPromptTemplate } from "./prompts";
import { callAI } from "./providers/anthropic";

export async function runWorkflow(
  type: WorkflowType,
  input: string
): Promise<string> {
  const template = getPromptTemplate(type);
  const output = await callAI(template.system, template.user(input));
  return output;
}
