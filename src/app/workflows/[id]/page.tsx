"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { ExecutionHistory } from "@/components/ExecutionHistory";
import {
  WORKFLOW_TYPE_LABELS,
  AI_PROVIDER_LABELS,
  AI_PROVIDER_MODELS,
  type Workflow,
  type AIProvider,
} from "@/types/workflow";

const PROVIDERS: AIProvider[] = ["ANTHROPIC", "OPENAI", "GEMINI"];

const PROVIDER_COLORS: Record<AIProvider, string> = {
  ANTHROPIC: "border-orange-300 bg-orange-50 text-orange-800",
  OPENAI: "border-emerald-300 bg-emerald-50 text-emerald-800",
  GEMINI: "border-blue-300 bg-blue-50 text-blue-800",
};

const PROVIDER_SELECTED: Record<AIProvider, string> = {
  ANTHROPIC: "border-orange-500 bg-orange-100 ring-2 ring-orange-400",
  OPENAI: "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400",
  GEMINI: "border-blue-500 bg-blue-100 ring-2 ring-blue-400",
};

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] =
    useState<AIProvider>("ANTHROPIC");

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
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workflows/${params.id}`);
        if (!res.ok) throw new Error("Workflow not found");
        const data = await res.json();
        if (!cancelled) setWorkflow(data.workflow);
      } catch {
        if (!cancelled) setError("Failed to load workflow.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params.id]);

  async function handleRun() {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflows/${params.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Execution failed");
      }
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
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
        <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
          Delete
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* LLM Selector + Run */}
      <Card>
        <CardBody>
          <p className="text-sm font-medium text-zinc-700 mb-3">
            Choose AI provider for this run
          </p>
          <div className="flex flex-wrap gap-3 mb-4">
            {PROVIDERS.map((provider) => (
              <button
                key={provider}
                onClick={() => setSelectedProvider(provider)}
                className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-all cursor-pointer min-w-[160px] ${
                  selectedProvider === provider
                    ? PROVIDER_SELECTED[provider]
                    : PROVIDER_COLORS[provider] +
                      " hover:opacity-80"
                }`}
              >
                <span className="text-sm font-semibold">
                  {AI_PROVIDER_LABELS[provider]}
                </span>
                <span className="text-xs opacity-70 mt-0.5">
                  {AI_PROVIDER_MODELS[provider]}
                </span>
              </button>
            ))}
          </div>
          <Button
            onClick={handleRun}
            isLoading={isRunning}
            disabled={workflow.status === "RUNNING"}
            size="lg"
          >
            {isRunning
              ? `Running with ${AI_PROVIDER_LABELS[selectedProvider]}…`
              : `Run with ${AI_PROVIDER_LABELS[selectedProvider]}`}
          </Button>
        </CardBody>
      </Card>

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
                No output yet. Select a provider and click &ldquo;Run&rdquo;.
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
