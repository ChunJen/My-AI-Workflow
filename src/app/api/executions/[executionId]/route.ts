import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ executionId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { executionId } = await params;
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
  });
  if (!execution) {
    return NextResponse.json({ error: "Execution not found" }, { status: 404 });
  }
  await prisma.workflowExecution.delete({ where: { id: executionId } });
  return NextResponse.json({ success: true });
}
