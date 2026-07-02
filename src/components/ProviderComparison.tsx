"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AI_PROVIDER_LABELS, AI_PROVIDER_MODELS, type AIProvider } from "@/types/workflow";

interface CompareResult {
  provider: AIProvider;
  model?: string;
  output?: string;
  durationMs?: number;
  estimatedCostUsd?: number | null;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  error?: string;
}

const PROVIDERS: AIProvider[] = ["ANTHROPIC", "OPENAI", "GEMINI"];

const PROVIDER_COLORS: Record<AIProvider, string> = {
  ANTHROPIC: "border-orange-200 bg-orange-50",
  OPENAI: "border-emerald-200 bg-emerald-50",
  GEMINI: "border-blue-200 bg-blue-50",
};

const PROVIDER_HEADER: Record<AIProvider, string> = {
  ANTHROPIC: "text-orange-800",
  OPENAI: "text-emerald-800",
  GEMINI: "text-blue-800",
};

function formatDuration(ms?: number) {
  if (ms == null) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(usd?: number | null) {
  if (usd == null) return "—";
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`;
  return `$${usd.toFixed(4)}`;
}

function formatTokens(n?: number) {
  if (n == null) return "—";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

interface ProviderComparisonProps {
  workflowId: string;
  onSetLatest?: () => void;
}

export function ProviderComparison({ workflowId, onSetLatest }: ProviderComparisonProps) {
  const [selected, setSelected] = useState<Set<AIProvider>>(
    new Set(["ANTHROPIC", "OPENAI"])
  );
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<CompareResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingLatest, setSettingLatest] = useState<AIProvider | null>(null);

  function toggleProvider(p: AIProvider) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size > 2) next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  }

  async function handleCompare() {
    setIsRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Comparison failed");
      } else {
        setResults(data.results);
      }
    } catch {
      setError("Network error");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSetLatest(result: CompareResult) {
    if (!result.output) return;
    setSettingLatest(result.provider);
    try {
      await fetch(`/api/workflows/${workflowId}/compare`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ output: result.output }),
      });
      onSetLatest?.();
    } catch {
      // silent
    } finally {
      setSettingLatest(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-zinc-900">
          Compare Providers
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Run the same input across multiple LLMs simultaneously
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Provider selector */}
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Select providers (min 2)
          </p>
          <div className="flex gap-3 flex-wrap">
            {PROVIDERS.map((p) => {
              const isOn = selected.has(p);
              return (
                <button
                  key={p}
                  onClick={() => toggleProvider(p)}
                  className={`flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-all min-w-[140px] ${
                    isOn
                      ? `${PROVIDER_COLORS[p]} border-current ring-2 ring-current ring-offset-1 ${PROVIDER_HEADER[p]}`
                      : "border-zinc-200 text-zinc-400 hover:border-zinc-300"
                  }`}
                >
                  <span className="text-sm font-semibold">
                    {AI_PROVIDER_LABELS[p]}
                  </span>
                  <span className="text-xs opacity-70 mt-0.5">
                    {AI_PROVIDER_MODELS[p]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Button
          onClick={handleCompare}
          isLoading={isRunning}
          disabled={selected.size < 2}
        >
          {isRunning ? "Running comparison…" : `Compare ${selected.size} Providers`}
        </Button>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        {/* Results */}
        {results && (
          <div className="grid gap-4 lg:grid-cols-3">
            {results.map((r) => (
              <div
                key={r.provider}
                className={`rounded-xl border p-4 space-y-3 ${
                  r.error
                    ? "border-red-200 bg-red-50"
                    : PROVIDER_COLORS[r.provider as AIProvider] ?? "border-zinc-200 bg-zinc-50"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-bold ${PROVIDER_HEADER[r.provider as AIProvider] ?? "text-zinc-900"}`}>
                      {AI_PROVIDER_LABELS[r.provider as AIProvider] ?? r.provider}
                    </p>
                    {r.model && (
                      <p className="text-xs text-zinc-500">{r.model}</p>
                    )}
                  </div>
                  {r.output && (
                    <Button
                      size="sm"
                      variant="secondary"
                      isLoading={settingLatest === r.provider}
                      onClick={() => handleSetLatest(r)}
                    >
                      Use
                    </Button>
                  )}
                </div>

                {/* Stats */}
                {!r.error && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span>{formatDuration(r.durationMs)}</span>
                    <span>{formatTokens(r.usage?.totalTokens)} tokens</span>
                    <span>{formatCost(r.estimatedCostUsd)}</span>
                  </div>
                )}

                {/* Output or error */}
                {r.error ? (
                  <p className="text-xs text-red-700">{r.error}</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-lg bg-white/60 p-3">
                    <p className="whitespace-pre-wrap text-sm text-zinc-700">
                      {r.output}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
