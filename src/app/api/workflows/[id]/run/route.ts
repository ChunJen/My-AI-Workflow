import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWorkflow } from "@/lib/ai";
import type { WorkflowType } from "@/types/workflow";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({ where: { id } });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  // Record start of execution
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: id,
      input: workflow.input,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  // Mark workflow as running
  await prisma.workflow.update({
    where: { id },
    data: { status: "RUNNING" },
  });

  try {
    const output = await runWorkflow(workflow.type as WorkflowType, workflow.input);

    // Update execution and workflow on success
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

    // Update execution and workflow on failure
    const [updatedExecution] = await prisma.$transaction([
      prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: "FAILED",
          errorMessage,
          completedAt: new Date(),
        },
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
