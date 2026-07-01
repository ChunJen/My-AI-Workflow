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

  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: id,
      input: workflow.input,
      status: "RUNNING",
      provider: provider as AIProvider,
      startedAt: new Date(),
    },
  });

  await prisma.workflow.update({
    where: { id },
    data: { status: "RUNNING" },
  });

  try {
    const output = await runWorkflow(
      workflow.type as WorkflowType,
      workflow.input,
      provider as AIProvider
    );

    const [updatedExecution] = await prisma.$transaction([
      prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { output, status: "COMPLETED", completedAt: new Date() },
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

    const [updatedExecution] = await prisma.$transaction([
      prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: "FAILED", errorMessage, completedAt: new Date() },
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
