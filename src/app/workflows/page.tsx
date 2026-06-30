import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { WORKFLOW_TYPE_LABELS, type WorkflowType } from "@/types/workflow";
import type { Workflow } from "@/generated/prisma/client";

type WorkflowWithCount = Workflow & { _count: { executions: number } };

async function getWorkflows(): Promise<WorkflowWithCount[]> {
  return prisma.workflow.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { executions: true } } },
  }) as Promise<WorkflowWithCount[]>;
}

export default async function WorkflowsPage() {
  const workflows = await getWorkflows();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Workflows</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {workflows.length} workflow{workflows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/workflows/new"
          className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          + New Workflow
        </Link>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <div className="px-6 py-16 text-center">
            <p className="text-zinc-400">No workflows yet.</p>
            <Link
              href="/workflows/new"
              className="mt-4 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Create your first workflow
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50 text-xs font-medium uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-3 text-left">Title</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Runs</th>
                <th className="px-6 py-3 text-left">Created</th>
                <th className="px-6 py-3 text-left">Updated</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {workflows.map((wf: WorkflowWithCount) => (
                <tr key={wf.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4 font-medium text-zinc-900">
                    {wf.title}
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                    {WORKFLOW_TYPE_LABELS[wf.type as WorkflowType]}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={wf.status} />
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                    {wf._count.executions}
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                    {new Date(wf.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                    {new Date(wf.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/workflows/${wf.id}`}
                      className="font-medium text-zinc-900 hover:text-zinc-600"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
