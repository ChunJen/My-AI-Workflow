import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateWorkflowSchema } from "@/lib/validations";
import { ZodError } from "zod";

export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        latestOutput: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { executions: true } },
      },
    });
    return NextResponse.json({ workflows });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateWorkflowSchema.parse(body);

    const workflow = await prisma.workflow.create({
      data: {
        title: data.title,
        type: data.type,
        input: data.input,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}
