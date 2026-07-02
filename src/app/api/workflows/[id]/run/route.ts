import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWorkflowByType, type AIProvider } from "@/lib/ai";
import { runSteps } from "@/lib/ai/step-runner";
import { RunWorkflowSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { order: "asc" } },
    },
  });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { provider } = RunWorkflowSchema.parse(body);

  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: id,
      input: workflow.input,
      inputSnapshot: workflow.input,
      status: "PENDING",
      provider: provider as AIProvider,
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
      where: { id },
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
      // Multi-step execution
      const summary = await runSteps(
        execution.id,
        workflow.input,
        workflow.steps,
        provider as AIProvider
      );
      output = summary.finalOutput;
      inputTokens = summary.totalInputTokens;
      outputTokens = summary.totalOutputTokens;
      totalTokens = summary.totalTokens;
      estimatedCostUsd = summary.totalCostUsd;
    } else {
      // Single-step (type-based) execution — look up config from DB
      const typeConfig = await prisma.workflowTypeConfig.findUnique({
        where: { slug: workflow.type },
      });
      const result = await runWorkflowByType(
        workflow.type,
        workflow.input,
        provider as AIProvider,
        typeConfig ?? undefined
      );
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
        data: {
          output,
          status: "COMPLETED",
          model,
          completedAt,
          durationMs,
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCostUsd,
        },
      }),
      prisma.workflow.update({
        where: { id },
        data: { latestOutput: output, status: "COMPLETED" },
      }),
    ]);

    return NextResponse.json({ execution: updatedExecution });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    const [updatedExecution] = await prisma.$transaction([
      prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: "FAILED", errorMessage, completedAt, durationMs },
      }),
      prisma.workflow.update({
        where: { id },
        data: { status: "FAILED" },
      }),
    ]);

    return NextResponse.json(
      { error: "Workflow execution failed", execution: updatedExecution },
      { status: 500 }
    );
  }
}
