import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const StepUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  provider: z.string().nullable().optional(),
  systemPrompt: z.string().min(1).optional(),
  userPrompt: z.string().min(1).optional(),
  inputMapping: z.string().nullable().optional(),
  outputKey: z.string().nullable().optional(),
  order: z.number().int().positive().optional(),
});

type Params = { params: Promise<{ id: string; stepId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { stepId } = await params;

  const step = await prisma.workflowStep.findUnique({ where: { id: stepId } });
  if (!step) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = StepUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.workflowStep.update({
    where: { id: stepId },
    data: parsed.data,
  });

  return NextResponse.json({ step: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { stepId } = await params;

  const step = await prisma.workflowStep.findUnique({ where: { id: stepId } });
  if (!step) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  await prisma.workflowStep.delete({ where: { id: stepId } });

  // Re-number remaining steps to keep order contiguous
  const remaining = await prisma.workflowStep.findMany({
    where: { workflowId: step.workflowId },
    orderBy: { order: "asc" },
  });
  await prisma.$transaction(
    remaining.map((s, i) =>
      prisma.workflowStep.update({ where: { id: s.id }, data: { order: i + 1 } })
    )
  );

  return NextResponse.json({ success: true });
}
