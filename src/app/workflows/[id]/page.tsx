"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { ExecutionHistory } from "@/components/ExecutionHistory";
import { WORKFLOW_TYPE_LABELS, type Workflow } from "@/types/workflow";

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflow = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflows/${params.id}`);
      if (!res.ok) throw new Error("Workflow not found");
      const data = await res.json();
      setWorkflow(data.workflow);
    } catch {
      setError("Failed to load workflow.");
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  async function handleRun() {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflows/${params.id}/run`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Execution failed");
      }
      // Refresh to get updated status and execution
      await fetchWorkflow();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this workflow? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/workflows/${params.id}`, { method: "DELETE" });
      router.push("/workflows");
    } catch {
      setError("Failed to delete workflow.");
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="py-24 text-center">
        <p className="text-zinc-400">Workflow not found.</p>
        <Link
          href="/workflows"
          className="mt-4 inline-block text-sm font-medium text-zinc-900 underline"
        >
          Back to workflows
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">
              {workflow.title}
            </h1>
            <StatusBadge status={workflow.status} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {WORKFLOW_TYPE_LABELS[workflow.type]} ·{" "}
            <span>
              Created {new Date(workflow.createdAt).toLocaleDateString()}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleRun}
            isLoading={isRunning}
            disabled={workflow.status === "RUNNING"}
          >
            {isRunning ? "Running…" : "Run Workflow"}
          </Button>
          <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-700">Input</h2>
          </CardHeader>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm text-zinc-700">
              {workflow.input}
            </p>
          </CardBody>
        </Card>

        {/* Latest Output */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-700">
              Latest Output
            </h2>
          </CardHeader>
          <CardBody>
            {workflow.latestOutput ? (
              <p className="whitespace-pre-wrap text-sm text-zinc-700">
                {workflow.latestOutput}
              </p>
            ) : (
              <p className="text-sm text-zinc-400">
                No output yet. Click &ldquo;Run Workflow&rdquo; to generate one.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Execution History */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-zinc-900">
            Execution History
          </h2>
        </CardHeader>
        <CardBody>
          <ExecutionHistory executions={workflow.executions ?? []} />
        </CardBody>
      </Card>
    </div>
  );
}
