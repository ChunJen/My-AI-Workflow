import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

const UpdateSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  systemPrompt: z.string().min(1).optional(),
  userPromptTemplate: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const config = await prisma.workflowTypeConfig.findUnique({ where: { slug } });
  if (!config) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updated = await prisma.workflowTypeConfig.update({
    where: { slug },
    data: parsed.data,
  });
  return NextResponse.json({ config: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const config = await prisma.workflowTypeConfig.findUnique({ where: { slug } });
  if (!config) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }
  if (config.isBuiltIn) {
    return NextResponse.json({ error: "Cannot delete built-in workflow types" }, { status: 403 });
  }

  const workflowCount = await prisma.workflow.count({ where: { type: slug } });
  if (workflowCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${workflowCount} workflow(s) use this type` },
      { status: 409 }
    );
  }

  await prisma.workflowTypeConfig.delete({ where: { slug } });
  return NextResponse.json({ success: true });
}
