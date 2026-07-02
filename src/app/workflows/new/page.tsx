"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AI_PROVIDER_LABELS, type WorkflowTypeConfig } from "@/types/workflow";

const STEP_PROVIDERS: Array<{ value: string; label: string }> = [
  { value: "", label: "Default (from Run button)" },
  { value: "ANTHROPIC", label: AI_PROVIDER_LABELS["ANTHROPIC"] },
  { value: "OPENAI", label: AI_PROVIDER_LABELS["OPENAI"] },
  { value: "GEMINI", label: AI_PROVIDER_LABELS["GEMINI"] },
];

const TEMPLATE_HINTS = ["{{workflow.input}}", "{{latestOutput}}", "{{steps.<outputKey>.output}}"];

interface DraftStep {
  name: string;
  type: string;
  provider: string;
  systemPrompt: string;
  userPrompt: string;
  outputKey: string;
}

const EMPTY_STEP: DraftStep = {
  name: "",
  type: "custom",
  provider: "",
  systemPrompt: "",
  userPrompt: "{{workflow.input}}",
  outputKey: "",
};

function StepForm({
  step,
  order,
  onChange,
  onRemove,
}: {
  step: DraftStep;
  order: number;
  onChange: (s: DraftStep) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
            {order}
          </span>
          <p className="text-sm font-semibold text-zinc-800">
            {step.name || `Step ${order}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-zinc-400 hover:text-red-600 transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {TEMPLATE_HINTS.map((h) => (
          <span key={h} className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-500">
            {h}
          </span>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Name *</label>
          <input
            type="text"
            value={step.name}
            onChange={(e) => onChange({ ...step, name: e.target.value })}
            placeholder="e.g. Extract Summary"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Output Key</label>
          <input
            type="text"
            value={step.outputKey}
            onChange={(e) => onChange({ ...step, outputKey: e.target.value })}
            placeholder="e.g. step_1"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">Provider Override</label>
        <select
          value={step.provider}
          onChange={(e) => onChange({ ...step, provider: e.target.value })}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        >
          {STEP_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">System Prompt *</label>
        <textarea
          value={step.systemPrompt}
          onChange={(e) => onChange({ ...step, systemPrompt: e.target.value })}
          rows={2}
          placeholder="You are an expert at..."
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">
          User Prompt *{" "}
          <span className="font-normal text-zinc-400">(use template variables above)</span>
        </label>
        <textarea
          value={step.userPrompt}
          onChange={(e) => onChange({ ...step, userPrompt: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const [typeConfigs, setTypeConfigs] = useState<WorkflowTypeConfig[]>([]);
  const [form, setForm] = useState({
    title: "",
    type: "",
    input: "",
  });
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [stepError, setStepError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/workflow-types")
      .then((r) => r.json())
      .then(({ configs }) => {
        const enabled: WorkflowTypeConfig[] = (configs ?? []).filter((c: WorkflowTypeConfig) => c.isEnabled);
        setTypeConfigs(enabled);
        if (enabled.length > 0 && !form.type) {
          setForm((f) => ({ ...f, type: enabled[0].slug }));
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedConfig = typeConfigs.find((c) => c.slug === form.type);

  function addStep() {
    setSteps((prev) => [...prev, { ...EMPTY_STEP }]);
  }

  function updateStep(index: number, s: DraftStep) {
    setSteps((prev) => prev.map((existing, i) => (i === index ? s : existing)));
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setStepError(null);

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (!s.name || !s.systemPrompt || !s.userPrompt) {
        setStepError(`Step ${i + 1} is missing required fields (Name, System Prompt, User Prompt).`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setErrors(
            Object.fromEntries(
              Object.entries(data.details as Record<string, string[]>).map(
                ([k, v]) => [k, (v as string[])[0]]
              )
            )
          );
        } else {
          setErrors({ _form: data.error ?? "Something went wrong" });
        }
        return;
      }

      const workflowId: string = data.workflow.id;

      for (const step of steps) {
        const stepRes = await fetch(`/api/workflows/${workflowId}/steps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...step,
            provider: step.provider || null,
            outputKey: step.outputKey || null,
          }),
        });
        if (!stepRes.ok) {
          const stepData = await stepRes.json();
          setStepError(stepData.error ?? "Failed to create step");
          return;
        }
      }

      router.push(`/workflows/${workflowId}`);
    } catch {
      setErrors({ _form: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">New Workflow</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create an AI automation workflow and optionally define multi-step execution.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Workflow details */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-zinc-900">Workflow details</h2>
          </CardHeader>
          <CardBody className="space-y-5">
            {errors._form && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errors._form}</p>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700">Workflow title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Summarize Q3 report"
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Workflow type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                {typeConfigs.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.label}</option>
                ))}
              </select>
              {selectedConfig && (
                <p className="mt-1.5 text-xs text-zinc-500">{selectedConfig.description}</p>
              )}
              {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Input text</label>
              <textarea
                value={form.input}
                onChange={(e) => setForm({ ...form, input: e.target.value })}
                rows={6}
                placeholder="Paste the text you want the AI to process..."
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              <div className="mt-1 flex items-center justify-between">
                {errors.input ? (
                  <p className="text-xs text-red-600">{errors.input}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-zinc-400">{form.input.length} / 10,000</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Steps */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Workflow Steps</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {steps.length === 0
                    ? "Optional — skip to use type-based default prompt."
                    : `${steps.length} step${steps.length > 1 ? "s" : ""} will run in order.`}
                </p>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={addStep}>
                + Add Step
              </Button>
            </div>
          </CardHeader>
          {(steps.length > 0 || stepError) && (
            <CardBody className="space-y-4">
              {stepError && (
                <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{stepError}</p>
              )}
              {steps.map((step, i) => (
                <StepForm
                  key={i}
                  step={step}
                  order={i + 1}
                  onChange={(s) => updateStep(i, s)}
                  onRemove={() => removeStep(i)}
                />
              ))}
            </CardBody>
          )}
        </Card>

        <div className="flex gap-3">
          <Button type="submit" isLoading={isSubmitting}>
            Create Workflow
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
