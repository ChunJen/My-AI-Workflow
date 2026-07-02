import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { WORKFLOW_TYPE_LABELS, AI_PROVIDER_LABELS, type AIProvider } from "@/types/workflow";
import type { WorkflowExecution, Workflow } from "@/generated/prisma/client";

type RecentExecution = WorkflowExecution & {
  workflow: Pick<Workflow, "title" | "type">;
};

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(usd: number | null): string {
  if (usd == null || usd === 0) return "$0.00";
  return `$${usd.toFixed(4)}`;
}

function formatTokens(n: number | bigint | null): string {
  if (n == null) return "0";
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

async function getDashboardData() {
  const [
    totalWorkflows,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    durationAgg,
    tokenAgg,
    costAgg,
    byProvider,
    recentExecutions,
    recentFailures,
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
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { workflow: { select: { title: true, type: true } } },
    }),
    prisma.workflowExecution.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { workflow: { select: { title: true } } },
    }),
  ]);

  const successRate =
    totalExecutions > 0
      ? Math.round((successfulExecutions / totalExecutions) * 100)
      : null;

  return {
    totalWorkflows,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    successRate,
    avgDurationMs: durationAgg._avg.durationMs,
    totalTokens: tokenAgg._sum.totalTokens,
    totalCostUsd: costAgg._sum.estimatedCostUsd,
    byProvider,
    recentExecutions,
    recentFailures,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const topStats = [
    {
      label: "Total Workflows",
      value: data.totalWorkflows,
      color: "text-zinc-900",
    },
    {
      label: "Total Executions",
      value: data.totalExecutions,
      color: "text-zinc-900",
    },
    {
      label: "Success Rate",
      value: data.successRate != null ? `${data.successRate}%` : "—",
      color: data.successRate != null && data.successRate >= 80 ? "text-emerald-600" : "text-red-600",
    },
    {
      label: "Avg Duration",
      value: formatDuration(data.avgDurationMs ?? null),
      color: "text-blue-600",
    },
    {
      label: "Total Tokens",
      value: formatTokens(data.totalTokens),
      color: "text-violet-600",
    },
    {
      label: "Est. Total Cost",
      value: formatCost(data.totalCostUsd ?? null),
      color: "text-amber-600",
    },
    {
      label: "Successful",
      value: data.successfulExecutions,
      color: "text-emerald-600",
    },
    {
      label: "Failed",
      value: data.failedExecutions,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          AI Workflow Ops — execution metrics and observability
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {topStats.map((stat) => (
          <Card key={stat.label}>
            <CardBody className="py-5">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                {stat.label}
              </p>
              <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Executions by Provider */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-900">
              Executions by Provider
            </h2>
          </CardHeader>
          <CardBody>
            {data.byProvider.length === 0 ? (
              <p className="text-sm text-zinc-400">No executions yet.</p>
            ) : (
              <div className="space-y-3">
                {data.byProvider.map((row) => {
                  const label =
                    AI_PROVIDER_LABELS[row.provider as AIProvider] ??
                    row.provider;
                  const pct =
                    data.totalExecutions > 0
                      ? Math.round((row._count._all / data.totalExecutions) * 100)
                      : 0;
                  return (
                    <div key={row.provider}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-zinc-700">{label}</span>
                        <span className="text-zinc-500">
                          {row._count._all} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100">
                        <div
                          className="h-1.5 rounded-full bg-zinc-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Failures */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-900">
              Recent Failures
            </h2>
          </CardHeader>
          <CardBody>
            {data.recentFailures.length === 0 ? (
              <p className="text-sm text-zinc-400">No failures. Great job!</p>
            ) : (
              <div className="space-y-3">
                {data.recentFailures.map((ex) => (
                  <div key={ex.id} className="text-sm">
                    <p className="font-medium text-zinc-800">
                      {(ex as RecentExecution).workflow.title}
                    </p>
                    {ex.errorMessage && (
                      <p className="mt-0.5 truncate text-xs text-red-600">
                        {ex.errorMessage}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {new Date(ex.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-900">
              Quick Actions
            </h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <Link
              href="/workflows/new"
              className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              + New Workflow
            </Link>
            <Link
              href="/workflows"
              className="flex w-full items-center justify-center rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              View All Workflows
            </Link>
          </CardBody>
        </Card>
      </div>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">
              Recent Executions
            </h2>
            <Link
              href="/workflows"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
            >
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {data.recentExecutions.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-zinc-400">No executions yet.</p>
              <Link
                href="/workflows/new"
                className="mt-3 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Create your first workflow
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-xs font-medium uppercase text-zinc-500">
                <tr>
                  <th className="px-6 py-3 text-left">Workflow</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Provider</th>
                  <th className="px-6 py-3 text-left">Duration</th>
                  <th className="px-6 py-3 text-left">Tokens</th>
                  <th className="px-6 py-3 text-left">Cost</th>
                  <th className="px-6 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.recentExecutions.map((ex) => {
                  const typedEx = ex as RecentExecution;
                  return (
                    <tr key={ex.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-3 font-medium text-zinc-900">
                        {typedEx.workflow.title}
                      </td>
                      <td className="px-6 py-3 text-zinc-500">
                        {WORKFLOW_TYPE_LABELS[typedEx.workflow.type] ?? typedEx.workflow.type}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={ex.status} />
                      </td>
                      <td className="px-6 py-3 text-zinc-500">
                        {AI_PROVIDER_LABELS[ex.provider as AIProvider] ?? ex.provider}
                      </td>
                      <td className="px-6 py-3 text-zinc-500">
                        {formatDuration(ex.durationMs)}
                      </td>
                      <td className="px-6 py-3 text-zinc-500">
                        {ex.totalTokens != null ? formatTokens(ex.totalTokens) : "—"}
                      </td>
                      <td className="px-6 py-3 text-zinc-500">
                        {ex.estimatedCostUsd != null
                          ? formatCost(ex.estimatedCostUsd)
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-zinc-500">
                        {new Date(ex.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
