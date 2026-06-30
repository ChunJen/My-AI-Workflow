import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { WORKFLOW_TYPE_LABELS, type WorkflowType } from "@/types/workflow";
import type { WorkflowExecution, Workflow } from "@/generated/prisma/client";

type RecentExecution = WorkflowExecution & {
  workflow: Pick<Workflow, "title" | "type">;
};

async function getDashboardData() {
  const [total, completed, failed, recentExecutions] = await Promise.all([
    prisma.workflow.count(),
    prisma.workflow.count({ where: { status: "COMPLETED" } }),
    prisma.workflow.count({ where: { status: "FAILED" } }),
    prisma.workflowExecution.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { workflow: { select: { title: true, type: true } } },
    }),
  ]);

  return { total, completed, failed, recentExecutions };
}

export default async function DashboardPage() {
  const { total, completed, failed, recentExecutions } =
    await getDashboardData();

  const stats = [
    { label: "Total Workflows", value: total, color: "text-zinc-900" },
    { label: "Completed", value: completed, color: "text-emerald-600" },
    { label: "Failed", value: failed, color: "text-red-600" },
    {
      label: "Success Rate",
      value: total > 0 ? `${Math.round((completed / total) * 100)}%` : "—",
      color: "text-blue-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of your AI automation workflows
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody className="py-5">
              <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
              <p className={`mt-1 text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </CardBody>
          </Card>
        ))}
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
          {recentExecutions.length === 0 ? (
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
                  <th className="px-6 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentExecutions.map((ex: RecentExecution) => (
                  <tr key={ex.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-3 font-medium text-zinc-900">
                      {ex.workflow.title}
                    </td>
                    <td className="px-6 py-3 text-zinc-500">
                      {WORKFLOW_TYPE_LABELS[ex.workflow.type as WorkflowType]}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={ex.status} />
                    </td>
                    <td className="px-6 py-3 text-zinc-500">
                      {new Date(ex.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
