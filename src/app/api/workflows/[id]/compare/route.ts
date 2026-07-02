import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runWorkflow, type AIProvider } from "@/lib/ai";
import type { WorkflowType } from "@/types/workflow";

const CompareSchema = z.object({
  providers: z
    .array(z.enum(["ANTHROPIC", "OPENAI", "GEMINI"]))
    .min(2, "Select at least 2 providers")
    .max(3),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({ where: { id } });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = CompareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { providers } = parsed.data;

  // Run all providers in parallel
  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      const startedAt = new Date();
      try {
        const result = await runWorkflow(
          workflow.type as WorkflowType,
          workflow.input,
          provider as AIProvider
        );
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();

        // Record each comparison run as its own execution
        await prisma.workflowExecution.create({
          data: {
            workflowId: id,
            input: workflow.input,
            inputSnapshot: workflow.input,
            output: result.output,
            status: "COMPLETED",
            provider: provider as AIProvider,
            triggerType: "MANUAL",
            model: result.model,
            startedAt,
            completedAt,
            durationMs,
            inputTokens: result.usage?.inputTokens ?? null,
            outputTokens: result.usage?.outputTokens ?? null,
            totalTokens: result.usage?.totalTokens ?? null,
            estimatedCostUsd: result.estimatedCostUsd ?? null,
          },
        });

        return {
          provider,
          model: result.model,
          output: result.output,
          durationMs,
          usage: result.usage,
          estimatedCostUsd: result.estimatedCostUsd,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const completedAt = new Date();

        await prisma.workflowExecution.create({
          data: {
            workflowId: id,
            input: workflow.input,
            inputSnapshot: workflow.input,
            status: "FAILED",
            provider: provider as AIProvider,
            triggerType: "MANUAL",
            errorMessage,
            startedAt,
            completedAt,
            durationMs: completedAt.getTime() - startedAt.getTime(),
          },
        });

        return { provider, error: errorMessage };
      }
    })
  );

  const responses = results.map((r) =>
    r.status === "fulfilled" ? r.value : { provider: "unknown", error: String(r.reason) }
  );

  return NextResponse.json({ results: responses });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { output } = body as { output?: string };

  if (!output) {
    return NextResponse.json({ error: "output is required" }, { status: 400 });
  }

  await prisma.workflow.update({
    where: { id },
    data: { latestOutput: output },
  });

  return NextResponse.json({ success: true });
}
