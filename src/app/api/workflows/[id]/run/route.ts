import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWorkflow, type AIProvider } from "@/lib/ai";
import { RunWorkflowSchema } from "@/lib/validations";
import type { WorkflowType } from "@/types/workflow";

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
  const { provider } = RunWorkflowSchema.parse(body);

  // Create execution in PENDING state
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

  // Transition to RUNNING
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
    const result = await runWorkflow(
      workflow.type as WorkflowType,
      workflow.input,
      provider as AIProvider
    );

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    const [updatedExecution] = await prisma.$transaction([
      prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          output: result.output,
          status: "COMPLETED",
          model: result.model,
          completedAt,
          durationMs,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          totalTokens: result.usage?.totalTokens ?? null,
          estimatedCostUsd: result.estimatedCostUsd ?? null,
        },
      }),
      prisma.workflow.update({
        where: { id },
        data: { latestOutput: result.output, status: "COMPLETED" },
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
