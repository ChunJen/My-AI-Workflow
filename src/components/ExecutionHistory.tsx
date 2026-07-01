import type { WorkflowExecution } from "@/types/workflow";
import { StatusBadge } from "@/components/StatusBadge";
import { AI_PROVIDER_LABELS, AI_PROVIDER_MODELS } from "@/types/workflow";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function durationMs(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

interface ExecutionHistoryProps {
  executions: WorkflowExecution[];
}

export function ExecutionHistory({ executions }: ExecutionHistoryProps) {
  if (executions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-400">
        No executions yet. Run the workflow to see history.
      </p>
    );
  }

  return (
    <div className="divide-y divide-zinc-100">
      {executions.map((ex) => (
        <div key={ex.id} className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={ex.status} />
              <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                {AI_PROVIDER_LABELS[ex.provider]} · {AI_PROVIDER_MODELS[ex.provider]}
              </span>
              <span className="text-sm text-zinc-500">
                {formatDate(ex.createdAt)}
              </span>
              <span className="text-sm text-zinc-400">
                {durationMs(ex.startedAt, ex.completedAt)}
              </span>
            </div>
          </div>
          {ex.status === "FAILED" && ex.errorMessage && (
            <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
              {ex.errorMessage}
            </p>
          )}
          {ex.output && (
            <div className="mt-3 rounded-lg bg-zinc-50 p-3">
              <p className="whitespace-pre-wrap text-sm text-zinc-700">
                {ex.output}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
