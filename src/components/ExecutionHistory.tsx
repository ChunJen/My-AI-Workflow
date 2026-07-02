"use client";

import { useState } from "react";
import type { WorkflowExecution, TriggerType } from "@/types/workflow";
import { StatusBadge } from "@/components/StatusBadge";
import { AI_PROVIDER_LABELS } from "@/types/workflow";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(n: number | null): string {
  if (n == null) return "—";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function formatCost(usd: number | null): string {
  if (usd == null) return "—";
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`;
  return `$${usd.toFixed(4)}`;
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  MANUAL: "Manual",
  SCHEDULED: "Scheduled",
  WEBHOOK: "Webhook",
  API: "API",
};

interface ExecutionHistoryProps {
  executions: WorkflowExecution[];
  onRefresh?: () => void;
}

function ActionButton({
  label,
  executionId,
  action,
  onRefresh,
}: {
  label: string;
  executionId: string;
  action: "rerun" | "retry";
  onRefresh?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/executions/${executionId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed");
      } else {
        onRefresh?.();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span>
      <button
        onClick={handle}
        disabled={loading}
        className="rounded px-2 py-0.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-40 transition-colors"
      >
        {loading ? "…" : label}
      </button>
      {error && (
        <span className="ml-1 text-xs text-red-500">{error}</span>
      )}
    </span>
  );
}

export function ExecutionHistory({ executions, onRefresh }: ExecutionHistoryProps) {
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
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={ex.status} />
                <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                  {AI_PROVIDER_LABELS[ex.provider]}
                  {ex.model ? ` · ${ex.model}` : ""}
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                  {TRIGGER_LABELS[ex.triggerType]}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span title="Duration">{formatDuration(ex.durationMs)}</span>
                {ex.totalTokens != null && (
                  <span title="Total tokens">{formatTokens(ex.totalTokens)} tokens</span>
                )}
                {ex.estimatedCostUsd != null && (
                  <span title="Estimated cost">{formatCost(ex.estimatedCostUsd)}</span>
                )}
                <span>{formatDate(ex.createdAt)}</span>
              </div>
            </div>

            {/* Rerun / Retry buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <ActionButton
                label="Rerun"
                executionId={ex.id}
                action="rerun"
                onRefresh={onRefresh}
              />
              <ActionButton
                label="Retry"
                executionId={ex.id}
                action="retry"
                onRefresh={onRefresh}
              />
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
