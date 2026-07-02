import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateCronExpression, getNextRunAt, registerSchedule, stopSchedule } from "@/lib/scheduler";

const ScheduleSchema = z.object({
  cronExpression: z.string().min(1, "Cron expression required"),
  timezone: z.string().default("Asia/Taipei"),
  isActive: z.boolean().default(true),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const schedule = await prisma.workflowSchedule.findUnique({
    where: { workflowId: id },
  });
  return NextResponse.json({ schedule });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({ where: { id } });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const existing = await prisma.workflowSchedule.findUnique({ where: { workflowId: id } });
  if (existing) {
    return NextResponse.json({ error: "Schedule already exists. Use PATCH to update." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = ScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { cronExpression, timezone, isActive } = parsed.data;
  if (!validateCronExpression(cronExpression)) {
    return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
  }

  const nextRunAt = getNextRunAt(cronExpression, timezone);
  const schedule = await prisma.workflowSchedule.create({
    data: { workflowId: id, cronExpression, timezone, isActive, nextRunAt },
  });

  if (isActive) {
    registerSchedule(schedule.id, id, cronExpression, timezone);
  }

  return NextResponse.json({ schedule }, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const schedule = await prisma.workflowSchedule.findUnique({ where: { workflowId: id } });
  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = ScheduleSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const updates = parsed.data;
  if (updates.cronExpression && !validateCronExpression(updates.cronExpression)) {
    return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
  }

  const newCron = updates.cronExpression ?? schedule.cronExpression;
  const newTimezone = updates.timezone ?? schedule.timezone;
  const nextRunAt =
    updates.cronExpression || updates.timezone
      ? getNextRunAt(newCron, newTimezone)
      : schedule.nextRunAt;

  const updated = await prisma.workflowSchedule.update({
    where: { id: schedule.id },
    data: { ...updates, nextRunAt },
  });

  const shouldBeActive = updated.isActive;
  if (shouldBeActive) {
    registerSchedule(updated.id, id, updated.cronExpression, updated.timezone);
  } else {
    stopSchedule(updated.id);
  }

  return NextResponse.json({ schedule: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const schedule = await prisma.workflowSchedule.findUnique({ where: { workflowId: id } });
  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  stopSchedule(schedule.id);
  await prisma.workflowSchedule.delete({ where: { id: schedule.id } });

  return NextResponse.json({ success: true });
}
