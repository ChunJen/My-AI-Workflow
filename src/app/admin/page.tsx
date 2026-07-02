"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { WorkflowTypeConfig } from "@/types/workflow";

const EMPTY_NEW: Omit<WorkflowTypeConfig, "id" | "isBuiltIn"> = {
  slug: "",
  label: "",
  description: "",
  systemPrompt: "",
  userPromptTemplate: "{{input}}",
  isEnabled: true,
};

function TypeCard({
  config,
  onSave,
  onDelete,
  onToggle,
}: {
  config: WorkflowTypeConfig;
  onSave: (slug: string, data: Partial<WorkflowTypeConfig>) => Promise<void>;
  onDelete: (slug: string) => Promise<void>;
  onToggle: (slug: string, enabled: boolean) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    label: config.label,
    description: config.description,
    systemPrompt: config.systemPrompt,
    userPromptTemplate: config.userPromptTemplate,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(config.slug, form);
      setExpanded(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete type "${config.label}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await onDelete(config.slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={`rounded-xl border ${config.isEnabled ? "border-zinc-200 bg-white" : "border-zinc-100 bg-zinc-50 opacity-60"}`}>
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={() => onToggle(config.slug, !config.isEnabled)}
            className={`mt-0.5 relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${config.isEnabled ? "bg-zinc-900" : "bg-zinc-200"}`}
            title={config.isEnabled ? "Disable" : "Enable"}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${config.isEnabled ? "translate-x-4" : "translate-x-0"}`} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-zinc-900">{config.label}</p>
              {config.isBuiltIn && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">built-in</span>
              )}
              <span className="font-mono text-xs text-zinc-400">{config.slug}</span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">{config.description}</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          {expanded ? "Collapse" : "Edit"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-zinc-100 p-4 space-y-4">
          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">System Prompt</label>
            <textarea
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              User Prompt Template{" "}
              <span className="font-normal text-zinc-400">— use {"{{input}}"} for the workflow input</span>
            </label>
            <textarea
              value={form.userPromptTemplate}
              onChange={(e) => setForm({ ...form, userPromptTemplate: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSave} isLoading={isSaving}>
              Save Changes
            </Button>
            {!config.isBuiltIn && (
              <Button size="sm" variant="danger" isLoading={isDeleting} onClick={handleDelete}>
                Delete Type
              </Button>
            )}
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-zinc-400 hover:text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewTypeForm({ onCreated }: { onCreated: () => void }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_NEW });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    if (!form.slug || !form.label || !form.systemPrompt || !form.userPromptTemplate) {
      setError("All fields are required.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/workflow-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        const firstError = data.details
          ? Object.values(data.details as Record<string, string[]>)[0]?.[0]
          : data.error;
        setError(firstError ?? "Failed to create");
        return;
      }
      setForm({ ...EMPTY_NEW });
      setShow(false);
      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setIsSaving(false);
    }
  }

  if (!show) {
    return (
      <Button variant="secondary" onClick={() => setShow(true)}>
        + Add New Type
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-50 p-4 space-y-4">
      <p className="text-sm font-semibold text-zinc-900">New Workflow Type</p>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Slug <span className="font-normal text-zinc-400">(uppercase, e.g. CODE_REVIEW)</span>
          </label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })}
            placeholder="MY_CUSTOM_TYPE"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Label</label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Code Review"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">Description</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Review code for bugs and best practices."
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">System Prompt</label>
        <textarea
          value={form.systemPrompt}
          onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
          rows={3}
          placeholder="You are an expert at..."
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">
          User Prompt Template <span className="font-normal text-zinc-400">— use {"{{input}}"}</span>
        </label>
        <textarea
          value={form.userPromptTemplate}
          onChange={(e) => setForm({ ...form, userPromptTemplate: e.target.value })}
          rows={3}
          placeholder="Please process:\n\n{{input}}"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <Button size="sm" onClick={handleCreate} isLoading={isSaving}>
          Create Type
        </Button>
        <button onClick={() => setShow(false)} className="text-xs text-zinc-400 hover:text-zinc-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [configs, setConfigs] = useState<WorkflowTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadConfigs() {
    try {
      const res = await fetch("/api/admin/workflow-types");
      const data = await res.json();
      setConfigs(data.configs ?? []);
    } catch {
      setError("Failed to load workflow type configs");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/workflow-types");
        const data = await res.json();
        setConfigs(data.configs ?? []);
      } catch {
        setError("Failed to load workflow type configs");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function handleSave(slug: string, updates: Partial<WorkflowTypeConfig>) {
    const res = await fetch(`/api/admin/workflow-types/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to save");
    setConfigs((prev) => prev.map((c) => (c.slug === slug ? data.config : c)));
  }

  async function handleDelete(slug: string) {
    const res = await fetch(`/api/admin/workflow-types/${slug}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to delete");
    setConfigs((prev) => prev.filter((c) => c.slug !== slug));
  }

  async function handleToggle(slug: string, enabled: boolean) {
    const res = await fetch(`/api/admin/workflow-types/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled: enabled }),
    });
    const data = await res.json();
    if (res.ok) setConfigs((prev) => prev.map((c) => (c.slug === slug ? data.config : c)));
  }

  const builtIn = configs.filter((c) => c.isBuiltIn);
  const custom = configs.filter((c) => !c.isBuiltIn);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Admin</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage workflow types, system prompts, and user prompt templates.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
        </div>
      ) : (
        <>
          {/* Built-in types */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-zinc-900">Built-in Workflow Types</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Edit prompts and labels. Built-in types cannot be deleted.
              </p>
            </CardHeader>
            <CardBody className="space-y-3">
              {builtIn.map((c) => (
                <TypeCard
                  key={c.slug}
                  config={c}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </CardBody>
          </Card>

          {/* Custom types */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-zinc-900">Custom Workflow Types</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Add your own types with custom prompts. Custom types can be deleted if unused.
              </p>
            </CardHeader>
            <CardBody className="space-y-3">
              {custom.length === 0 && (
                <p className="text-sm text-zinc-400">No custom types yet.</p>
              )}
              {custom.map((c) => (
                <TypeCard
                  key={c.slug}
                  config={c}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
              <NewTypeForm onCreated={loadConfigs} />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
