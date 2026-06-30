"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WORKFLOW_TYPE_LABELS, type WorkflowType } from "@/types/workflow";

const WORKFLOW_TYPES = Object.entries(WORKFLOW_TYPE_LABELS) as [
  WorkflowType,
  string,
][];

const TYPE_DESCRIPTIONS: Record<WorkflowType, string> = {
  TEXT_SUMMARIZATION: "Condense long text into clear, structured summaries.",
  PROFESSIONAL_REWRITE:
    "Polish informal text into professional business language.",
  TASK_BREAKDOWN:
    "Break a project or request into prioritised, actionable tasks.",
  GITHUB_ISSUE_ANALYSIS:
    "Triage a GitHub issue — severity, affected area, next actions.",
  MEETING_NOTES_EXTRACTION:
    "Extract decisions, action items, and follow-ups from meeting notes.",
};

export default function NewWorkflowPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    type: "TEXT_SUMMARIZATION" as WorkflowType,
    input: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
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

      router.push(`/workflows/${data.workflow.id}`);
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
          Create an AI automation workflow and run it immediately.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-zinc-900">
            Workflow details
          </h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors._form && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors._form}
              </p>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Workflow title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Summarize Q3 report"
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Workflow type
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as WorkflowType })
                }
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                {WORKFLOW_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-zinc-500">
                {TYPE_DESCRIPTIONS[form.type]}
              </p>
            </div>

            {/* Input */}
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Input text
              </label>
              <textarea
                value={form.input}
                onChange={(e) => setForm({ ...form, input: e.target.value })}
                rows={8}
                placeholder="Paste the text you want the AI to process..."
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              <div className="mt-1 flex items-center justify-between">
                {errors.input ? (
                  <p className="text-xs text-red-600">{errors.input}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-zinc-400">
                  {form.input.length} / 10,000
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" isLoading={isSubmitting}>
                Create Workflow
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
