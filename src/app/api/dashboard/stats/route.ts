import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [
    totalWorkflows,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    durationAgg,
    tokenAgg,
    costAgg,
    byProvider,
    recentFailures,
    recentExecutions,
  ] = await Promise.all([
    prisma.workflow.count(),
    prisma.workflowExecution.count(),
    prisma.workflowExecution.count({ where: { status: "COMPLETED" } }),
    prisma.workflowExecution.count({ where: { status: "FAILED" } }),
    prisma.workflowExecution.aggregate({
      _avg: { durationMs: true },
      where: { status: "COMPLETED", durationMs: { not: null } },
    }),
    prisma.workflowExecution.aggregate({
      _sum: { totalTokens: true },
    }),
    prisma.workflowExecution.aggregate({
      _sum: { estimatedCostUsd: true },
    }),
    prisma.workflowExecution.groupBy({
      by: ["provider"],
      _count: { _all: true },
    }),
    prisma.workflowExecution.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { workflow: { select: { title: true } } },
    }),
    prisma.workflowExecution.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { workflow: { select: { title: true, type: true } } },
    }),
  ]);

  const successRate =
    totalExecutions > 0 ? successfulExecutions / totalExecutions : null;

  const executionsByProvider = Object.fromEntries(
    byProvider.map((row) => [row.provider.toLowerCase(), row._count._all])
  );

  return NextResponse.json({
    totalWorkflows,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    successRate,
    averageDurationMs: durationAgg._avg.durationMs ?? null,
    totalTokens: tokenAgg._sum.totalTokens ?? 0,
    estimatedTotalCostUsd: costAgg._sum.estimatedCostUsd ?? 0,
    executionsByProvider,
    recentFailures,
    recentExecutions,
  });
}
