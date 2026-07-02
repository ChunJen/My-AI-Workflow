import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ConfigSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Z0-9_]+$/, "Slug must be uppercase letters, numbers, and underscores"),
  label: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  systemPrompt: z.string().min(1),
  userPromptTemplate: z.string().min(1),
  isEnabled: z.boolean().default(true),
});

export async function GET() {
  const configs = await prisma.workflowTypeConfig.findMany({
    orderBy: [{ isBuiltIn: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ configs });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = ConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await prisma.workflowTypeConfig.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existing) {
    return NextResponse.json({ error: "A type with this slug already exists" }, { status: 409 });
  }

  const config = await prisma.workflowTypeConfig.create({
    data: { ...parsed.data, isBuiltIn: false },
  });
  return NextResponse.json({ config }, { status: 201 });
}
