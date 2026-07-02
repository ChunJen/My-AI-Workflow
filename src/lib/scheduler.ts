import cron, { type ScheduledTask } from "node-cron";
import { CronExpressionParser } from "cron-parser";
import { prisma } from "@/lib/prisma";
import { runWorkflowByType } from "@/lib/ai";
import type { AIProvider } from "@/types/workflow";

export function getNextRunAt(
  cronExpression: string,
  timezone: string
): Date | null {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      tz: timezone,
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

export function validateCronExpression(expression: string): boolean {
  return cron.validate(expression);
}

async function runScheduledWorkflow(workflowId: string, scheduleId: string) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });
  if (!workflow) return;

  const now = new Date();
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      input: workflow.input,
      inputSnapshot: workflow.input,
      status: "RUNNING",
      provider: "ANTHROPIC",
      triggerType: "SCHEDULED",
      startedAt: now,
    },
  });

  await prisma.workflow.update({ where: { id: workflowId }, data: { status: "RUNNING" } });

  try {
    const typeConfig = await prisma.workflowTypeConfig.findUnique({ where: { slug: workflow.type } });
    const result = await runWorkflowByType(
      workflow.type,
      workflow.input,
      "ANTHROPIC" as AIProvider,
      typeConfig ?? undefined
    );

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - now.getTime();

    await prisma.$transaction([
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
        where: { id: workflowId },
        data: { latestOutput: result.output, status: "COMPLETED" },
      }),
    ]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const completedAt = new Date();
    await prisma.$transaction([
      prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: "FAILED",
          errorMessage,
          completedAt,
          durationMs: completedAt.getTime() - now.getTime(),
        },
      }),
      prisma.workflow.update({
        where: { id: workflowId },
        data: { status: "FAILED" },
      }),
    ]);
  }

  // Update schedule lastRunAt and nextRunAt
  const schedule = await prisma.workflowSchedule.findUnique({ where: { id: scheduleId } });
  if (schedule) {
    await prisma.workflowSchedule.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: now,
        nextRunAt: getNextRunAt(schedule.cronExpression, schedule.timezone),
      },
    });
  }
}

const activeTasks = new Map<string, ScheduledTask>();

export async function startScheduler() {
  console.log("[scheduler] Starting...");

  const schedules = await prisma.workflowSchedule.findMany({
    where: { isActive: true },
    include: { workflow: true },
  });

  for (const schedule of schedules) {
    registerSchedule(schedule.id, schedule.workflowId, schedule.cronExpression, schedule.timezone);
  }

  console.log(`[scheduler] Loaded ${schedules.length} active schedules.`);
}

export function registerSchedule(
  scheduleId: string,
  workflowId: string,
  cronExpression: string,
  timezone: string
) {
  stopSchedule(scheduleId);

  if (!cron.validate(cronExpression)) {
    console.warn(`[scheduler] Invalid cron expression: ${cronExpression}`);
    return;
  }

  const task = cron.schedule(
    cronExpression,
    () => {
      runScheduledWorkflow(workflowId, scheduleId).catch((err) =>
        console.error(`[scheduler] Error running workflow ${workflowId}:`, err)
      );
    },
    { timezone }
  );

  activeTasks.set(scheduleId, task);
  console.log(`[scheduler] Registered schedule ${scheduleId} (${cronExpression})`);
}

export function stopSchedule(scheduleId: string) {
  const existing = activeTasks.get(scheduleId);
  if (existing) {
    existing.stop();
    activeTasks.delete(scheduleId);
  }
}

export function stopAll() {
  for (const [id, task] of activeTasks) {
    task.stop();
    activeTasks.delete(id);
  }
  console.log("[scheduler] All schedules stopped.");
}
