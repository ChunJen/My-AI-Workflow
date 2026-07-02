"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Schedule {
  id: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

const CRON_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Daily at 9am", value: "0 9 * * *" },
  { label: "Weekly (Mon 9am)", value: "0 9 * * 1" },
];

function formatDateTime(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function WorkflowSchedule({ workflowId }: { workflowId: string }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [cronExpression, setCronExpression] = useState("0 9 * * *");
  const [timezone, setTimezone] = useState("Asia/Taipei");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetch(`/api/workflows/${workflowId}/schedule`)
      .then((r) => r.json())
      .then(({ schedule: s }) => {
        if (s) {
          setSchedule(s);
          setCronExpression(s.cronExpression);
          setTimezone(s.timezone);
          setIsActive(s.isActive);
        }
      })
      .catch(() => setError("Failed to load schedule"))
      .finally(() => setIsLoading(false));
  }, [workflowId]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const method = schedule ? "PATCH" : "POST";
      const res = await fetch(`/api/workflows/${workflowId}/schedule`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronExpression, timezone, isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save schedule");
      } else {
        setSchedule(data.schedule);
        setSuccess("Schedule saved.");
      }
    } catch {
      setError("Network error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this schedule?")) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/workflows/${workflowId}/schedule`, { method: "DELETE" });
      setSchedule(null);
      setCronExpression("0 9 * * *");
      setIsActive(true);
      setSuccess("Schedule deleted.");
    } catch {
      setError("Failed to delete schedule");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Schedule</h2>
          {schedule && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                schedule.isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {schedule.isActive ? "Active" : "Inactive"}
            </span>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {schedule && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">Last Run</p>
              <p className="font-medium text-zinc-800">
                {formatDateTime(schedule.lastRunAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Next Run</p>
              <p className="font-medium text-zinc-800">
                {formatDateTime(schedule.nextRunAt)}
              </p>
            </div>
          </div>
        )}

        {/* Presets */}
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Presets
          </p>
          <div className="flex flex-wrap gap-2">
            {CRON_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setCronExpression(p.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  cronExpression === p.value
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cron Expression */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Cron Expression
          </label>
          <input
            type="text"
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            placeholder="0 9 * * *"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono text-zinc-800 focus:border-zinc-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Format: minute hour day month weekday &nbsp;·&nbsp;
            <a
              href="https://crontab.guru"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 underline"
            >
              crontab.guru
            </a>
          </p>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Timezone
          </label>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Asia/Taipei"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <button
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              isActive ? "bg-zinc-900" : "bg-zinc-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                isActive ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm text-zinc-700">
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}
        {success && (
          <p className="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {success}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} isLoading={isSaving}>
            {schedule ? "Update Schedule" : "Save Schedule"}
          </Button>
          {schedule && (
            <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
