import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const StepSchema = z.object({
  name: z.string().min(1, "Name required"),
  type: z.string().min(1, "Type required"),
  provider: z.string().nullable().optional(),
  systemPrompt: z.string().min(1, "System prompt required"),
  userPrompt: z.string().min(1, "User prompt required"),
  inputMapping: z.string().nullable().optional(),
  outputKey: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const steps = await prisma.workflowStep.findMany({
    where: { workflowId: id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ steps });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({ where: { id } });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = StepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Assign the next order value
  const lastStep = await prisma.workflowStep.findFirst({
    where: { workflowId: id },
    orderBy: { order: "desc" },
  });
  const order = (lastStep?.order ?? 0) + 1;

  const step = await prisma.workflowStep.create({
    data: { workflowId: id, order, ...parsed.data },
  });

  return NextResponse.json({ step }, { status: 201 });
}
