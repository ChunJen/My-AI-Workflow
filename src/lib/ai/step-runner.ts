import { prisma } from "@/lib/prisma";
import { callAI } from "./providers/anthropic";
import { callOpenAI } from "./providers/openai";
import { callGemini } from "./providers/gemini";
import { resolveTemplate, type StepContext } from "./template";
import type { AIProviderResult } from "./types";

type StepProvider = "ANTHROPIC" | "OPENAI" | "GEMINI";

async function callProvider(
  provider: StepProvider,
  system: string,
  user: string
): Promise<AIProviderResult> {
  switch (provider) {
    case "OPENAI":
      return callOpenAI(system, user);
    case "GEMINI":
      return callGemini(system, user);
    default:
      return callAI(system, user);
  }
}

export type StepRunSummary = {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  finalOutput: string;
};

export async function runSteps(
  executionId: string,
  workflowInput: string,
  steps: Array<{
    id: string;
    order: number;
    name: string;
    provider: string | null;
    systemPrompt: string;
    userPrompt: string;
    outputKey: string | null;
    promptVersion: number;
  }>,
  defaultProvider: StepProvider = "ANTHROPIC"
): Promise<StepRunSummary> {
  const ctx: StepContext = {
    workflowInput,
    stepOutputs: {},
    latestOutput: "",
  };

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;

  const sorted = [...steps].sort((a, b) => a.order - b.order);

  for (const step of sorted) {
    const provider = (step.provider as StepProvider | null) ?? defaultProvider;
    const resolvedSystem = resolveTemplate(step.systemPrompt, ctx);
    const resolvedUser = resolveTemplate(step.userPrompt, ctx);

    const stepExecution = await prisma.workflowStepExecution.create({
      data: {
        executionId,
        stepId: step.id,
        status: "RUNNING",
        provider,
        promptVersion: step.promptVersion,
        input: resolvedUser,
        startedAt: new Date(),
      },
    });

    try {
      const result = await callProvider(provider, resolvedSystem, resolvedUser);
      const completedAt = new Date();

      await prisma.workflowStepExecution.update({
        where: { id: stepExecution.id },
        data: {
          status: "COMPLETED",
          output: result.output,
          model: result.model,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          totalTokens: result.usage?.totalTokens ?? null,
          estimatedCostUsd: result.estimatedCostUsd ?? null,
          completedAt,
        },
      });

      // Update context for next step
      ctx.latestOutput = result.output;
      if (step.outputKey) {
        ctx.stepOutputs[step.outputKey] = result.output;
      }

      totalInputTokens += result.usage?.inputTokens ?? 0;
      totalOutputTokens += result.usage?.outputTokens ?? 0;
      totalCostUsd += result.estimatedCostUsd ?? 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await prisma.workflowStepExecution.update({
        where: { id: stepExecution.id },
        data: {
          status: "FAILED",
          errorMessage,
          completedAt: new Date(),
        },
      });
      throw new Error(`Step "${step.name}" failed: ${errorMessage}`);
    }
  }

  return {
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalCostUsd,
    finalOutput: ctx.latestOutput,
  };
}
