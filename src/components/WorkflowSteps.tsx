"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AI_PROVIDER_LABELS, type AIProvider } from "@/types/workflow";

interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  type: string;
  provider: string | null;
  systemPrompt: string;
  userPrompt: string;
  outputKey: string | null;
  promptVersion: number;
}

const PROVIDERS: Array<{ value: string; label: string }> = [
  { value: "", label: "Default (from Run button)" },
  { value: "ANTHROPIC", label: AI_PROVIDER_LABELS["ANTHROPIC"] },
  { value: "OPENAI", label: AI_PROVIDER_LABELS["OPENAI"] },
  { value: "GEMINI", label: AI_PROVIDER_LABELS["GEMINI"] },
];

const TEMPLATE_HINTS = [
  "{{workflow.input}}",
  "{{latestOutput}}",
  "{{steps.<outputKey>.output}}",
];

const EMPTY_STEP = {
  name: "",
  type: "custom",
  provider: "",
  systemPrompt: "",
  userPrompt: "{{workflow.input}}",
  outputKey: "",
};

export function WorkflowSteps({ workflowId }: { workflowId: string }) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_STEP);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/workflows/${workflowId}/steps`)
      .then((r) => r.json())
      .then(({ steps: s }) => setSteps(s ?? []))
      .catch(() => setError("Failed to load steps"))
      .finally(() => setIsLoading(false));
  }, [workflowId]);

  function startEdit(step: WorkflowStep) {
    setEditingId(step.id);
    setForm({
      name: step.name,
      type: step.type,
      provider: step.provider ?? "",
      systemPrompt: step.systemPrompt,
      userPrompt: step.userPrompt,
      outputKey: step.outputKey ?? "",
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_STEP);
    setError(null);
  }

  async function handleSave() {
    if (!form.name || !form.systemPrompt || !form.userPrompt) {
      setError("Name, System Prompt, and User Prompt are required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        provider: form.provider || null,
        outputKey: form.outputKey || null,
      };
      const url = editingId
        ? `/api/workflows/${workflowId}/steps/${editingId}`
        : `/api/workflows/${workflowId}/steps`;
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save step");
        return;
      }

      if (editingId) {
        setSteps((prev) =>
          prev.map((s) => (s.id === editingId ? data.step : s))
        );
      } else {
        setSteps((prev) => [...prev, data.step]);
      }
      cancelForm();
    } catch {
      setError("Network error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(stepId: string) {
    if (!confirm("Delete this step?")) return;
    setDeletingId(stepId);
    try {
      await fetch(`/api/workflows/${workflowId}/steps/${stepId}`, {
        method: "DELETE",
      });
      const res = await fetch(`/api/workflows/${workflowId}/steps`);
      const { steps: s } = await res.json();
      setSteps(s ?? []);
    } catch {
      setError("Failed to delete step");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Workflow Steps
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {steps.length === 0
                ? "No steps defined — uses default type prompt."
                : `${steps.length} step${steps.length > 1 ? "s" : ""} run in order`}
            </p>
          </div>
          {!showForm && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setForm(EMPTY_STEP);
              }}
            >
              + Add Step
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        {/* Step List */}
        {steps.length > 0 && (
          <div className="space-y-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600">
                    {step.order}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {step.name}
                    </p>
                    {step.provider && (
                      <p className="text-xs text-zinc-500">
                        {AI_PROVIDER_LABELS[step.provider as AIProvider] ??
                          step.provider}
                      </p>
                    )}
                    {step.outputKey && (
                      <p className="mt-0.5 font-mono text-xs text-violet-600">
                        outputKey: {step.outputKey}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Prompt v{step.promptVersion}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                      {step.userPrompt}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(step)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={deletingId === step.id}
                    onClick={() => handleDelete(step.id)}
                  >
                    Del
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
            <p className="text-sm font-semibold text-zinc-800">
              {editingId ? "Edit Step" : `New Step (Order ${steps.length + 1})`}
            </p>

            {/* Template hints */}
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_HINTS.map((hint) => (
                <span
                  key={hint}
                  className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-500"
                >
                  {hint}
                </span>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Extract Summary"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Output Key (for template refs)
                </label>
                <input
                  type="text"
                  value={form.outputKey}
                  onChange={(e) =>
                    setForm({ ...form, outputKey: e.target.value })
                  }
                  placeholder="e.g. step_1"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Provider Override
              </label>
              <select
                value={form.provider}
                onChange={(e) =>
                  setForm({ ...form, provider: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                System Prompt *
              </label>
              <textarea
                value={form.systemPrompt}
                onChange={(e) =>
                  setForm({ ...form, systemPrompt: e.target.value })
                }
                rows={3}
                placeholder="You are an expert at..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                User Prompt *{" "}
                <span className="font-normal text-zinc-400">
                  (use template variables above)
                </span>
              </label>
              <textarea
                value={form.userPrompt}
                onChange={(e) =>
                  setForm({ ...form, userPrompt: e.target.value })
                }
                rows={4}
                placeholder="Please process the following:\n\n{{workflow.input}}"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} isLoading={isSaving}>
                {editingId ? "Update Step" : "Add Step"}
              </Button>
              <Button variant="ghost" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
