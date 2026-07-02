import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWorkflowByType, type AIProvider } from "@/lib/ai";
import { runSteps } from "@/lib/ai/step-runner";

type Params = { params: Promise<{ executionId: string }> };

// Rerun: use current workflow settings (same as clicking Run now)
export async function POST(_req: NextRequest, { params }: Params) {
  const { executionId } = await params;

  const original = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: { workflow: { include: { steps: { orderBy: { order: "asc" } } } } },
  });

  if (!original) {
    return NextResponse.json({ error: "Execution not found" }, { status: 404 });
  }

  const { workflow } = original;
  const provider = original.provider as AIProvider;

  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      input: workflow.input,
      inputSnapshot: workflow.input,
      status: "PENDING",
      provider,
      triggerType: "MANUAL",
    },
  });

  const startedAt = new Date();
  await prisma.$transaction([
    prisma.workflowExecution.update({
      where: { id: execution.id },
      data: { status: "RUNNING", startedAt },
    }),
    prisma.workflow.update({
      where: { id: workflow.id },
      data: { status: "RUNNING" },
    }),
  ]);

  try {
    let output: string;
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    let totalTokens: number | null = null;
    let estimatedCostUsd: number | null = null;
    let model: string | null = null;

    if (workflow.steps.length > 0) {
      const summary = await runSteps(execution.id, workflow.input, workflow.steps, provider);
      output = summary.finalOutput;
      inputTokens = summary.totalInputTokens;
      outputTokens = summary.totalOutputTokens;
      totalTokens = summary.totalTokens;
      estimatedCostUsd = summary.totalCostUsd;
    } else {
      const typeConfig = await prisma.workflowTypeConfig.findUnique({ where: { slug: workflow.type } });
      const result = await runWorkflowByType(workflow.type, workflow.input, provider, typeConfig ?? undefined);
      output = result.output;
      model = result.model;
      inputTokens = result.usage?.inputTokens ?? null;
      outputTokens = result.usage?.outputTokens ?? null;
      totalTokens = result.usage?.totalTokens ?? null;
      estimatedCostUsd = result.estimatedCostUsd ?? null;
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    const [updatedExecution] = await prisma.$transaction([
      prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { output, status: "COMPLETED", model, completedAt, durationMs, inputTokens, outputTokens, totalTokens, estimatedCostUsd },
      }),
      prisma.workflow.update({
        where: { id: workflow.id },
        data: { latestOutput: output, status: "COMPLETED" },
      }),
    ]);

    return NextResponse.json({ execution: updatedExecution });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    const [updatedExecution] = await prisma.$transaction([
      prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: "FAILED", errorMessage, completedAt, durationMs },
      }),
      prisma.workflow.update({
        where: { id: workflow.id },
        data: { status: "FAILED" },
      }),
    ]);

    return NextResponse.json(
      { error: "Rerun failed", execution: updatedExecution },
      { status: 500 }
    );
  }
}
