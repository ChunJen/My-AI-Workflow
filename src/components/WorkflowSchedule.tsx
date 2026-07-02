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

type Frequency = "every" | "daily" | "weekly";
type EveryUnit = "minutes" | "hours";

const EVERY_MINUTE_OPTIONS = [15, 30];
const EVERY_HOUR_OPTIONS = [1, 2, 4, 6, 12];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 30, 45];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildCron(
  frequency: Frequency,
  everyUnit: EveryUnit,
  everyValue: number,
  hour: number,
  minute: number,
  weekday: number
): string {
  if (frequency === "every") {
    if (everyUnit === "minutes") return `*/${everyValue} * * * *`;
    return `0 */${everyValue} * * *`;
  }
  if (frequency === "daily") return `${minute} ${hour} * * *`;
  return `${minute} ${hour} * * ${weekday}`;
}

function parseCron(expr: string): {
  frequency: Frequency;
  everyUnit: EveryUnit;
  everyValue: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  const defaults = { frequency: "daily" as Frequency, everyUnit: "hours" as EveryUnit, everyValue: 1, hour: 9, minute: 0, weekday: 1 };
  try {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return defaults;
    const [min, hr, , , dow] = parts;
    if (min.startsWith("*/") && hr === "*") {
      return { ...defaults, frequency: "every", everyUnit: "minutes", everyValue: parseInt(min.slice(2)) };
    }
    if (min === "0" && hr.startsWith("*/")) {
      return { ...defaults, frequency: "every", everyUnit: "hours", everyValue: parseInt(hr.slice(2)) };
    }
    if (dow !== "*") {
      return { ...defaults, frequency: "weekly", hour: parseInt(hr), minute: parseInt(min), weekday: parseInt(dow) };
    }
    return { ...defaults, frequency: "daily", hour: parseInt(hr), minute: parseInt(min) };
  } catch {
    return defaults;
  }
}

function describeSchedule(freq: Frequency, everyUnit: EveryUnit, everyValue: number, hour: number, minute: number, weekday: number): string {
  if (freq === "every") {
    return everyUnit === "minutes"
      ? `Every ${everyValue} minutes`
      : everyValue === 1 ? "Every hour" : `Every ${everyValue} hours`;
  }
  const time = `${pad(hour)}:${pad(minute)}`;
  if (freq === "daily") return `Daily at ${time}`;
  return `Every ${WEEKDAYS[weekday]} at ${time}`;
}

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

  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [everyUnit, setEveryUnit] = useState<EveryUnit>("hours");
  const [everyValue, setEveryValue] = useState(1);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [weekday, setWeekday] = useState(1);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetch(`/api/workflows/${workflowId}/schedule`)
      .then((r) => r.json())
      .then(({ schedule: s }) => {
        if (s) {
          setSchedule(s);
          setIsActive(s.isActive);
          const parsed = parseCron(s.cronExpression);
          setFrequency(parsed.frequency);
          setEveryUnit(parsed.everyUnit);
          setEveryValue(parsed.everyValue);
          setHour(parsed.hour);
          setMinute(parsed.minute);
          setWeekday(parsed.weekday);
        }
      })
      .catch(() => setError("Failed to load schedule"))
      .finally(() => setIsLoading(false));
  }, [workflowId]);

  const cronExpression = buildCron(frequency, everyUnit, everyValue, hour, minute, weekday);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const method = schedule ? "PATCH" : "POST";
      const res = await fetch(`/api/workflows/${workflowId}/schedule`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronExpression, timezone: "Asia/Taipei", isActive }),
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
      setFrequency("daily");
      setHour(9);
      setMinute(0);
      setIsActive(true);
      setSuccess("Schedule deleted.");
    } catch {
      setError("Failed to delete");
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
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${schedule.isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
              {schedule.isActive ? "Active" : "Inactive"}
            </span>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-5">
        {/* Last / Next run */}
        {schedule && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">Last Run</p>
              <p className="font-medium text-zinc-800">{formatDateTime(schedule.lastRunAt)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Next Run</p>
              <p className="font-medium text-zinc-800">{formatDateTime(schedule.nextRunAt)}</p>
            </div>
          </div>
        )}

        {/* Frequency tabs */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Frequency</p>
          <div className="flex rounded-lg border border-zinc-200 p-0.5 w-fit gap-0.5">
            {(["every", "daily", "weekly"] as Frequency[]).map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
                  frequency === f ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Every options */}
        {frequency === "every" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["minutes", "hours"] as EveryUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => { setEveryUnit(u); setEveryValue(u === "minutes" ? 15 : 1); }}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors capitalize ${
                    everyUnit === u ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(everyUnit === "minutes" ? EVERY_MINUTE_OPTIONS : EVERY_HOUR_OPTIONS).map((v) => (
                <button
                  key={v}
                  onClick={() => setEveryValue(v)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    everyValue === v ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                  }`}
                >
                  {everyUnit === "minutes" ? `${v} min` : v === 1 ? "1 hour" : `${v} hours`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Daily / Weekly time picker */}
        {(frequency === "daily" || frequency === "weekly") && (
          <div className="space-y-3">
            {frequency === "weekly" && (
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500">Day of Week</p>
                <div className="flex gap-2 flex-wrap">
                  {WEEKDAYS.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => setWeekday(i)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        weekday === i ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500">Time (Asia/Taipei)</p>
              <div className="flex items-center gap-2">
                <select
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{pad(h)}:00</option>
                  ))}
                </select>
                <span className="text-zinc-400">:</span>
                <select
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>{pad(m)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Summary + cron preview */}
        <div className="rounded-lg bg-zinc-50 px-4 py-3">
          <p className="text-sm font-medium text-zinc-800">
            {describeSchedule(frequency, everyUnit, everyValue, hour, minute, weekday)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-zinc-400">{cronExpression}</p>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <button
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isActive ? "bg-zinc-900" : "bg-zinc-200"}`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isActive ? "translate-x-4" : "translate-x-0"}`} />
          </button>
          <span className="text-sm text-zinc-700">{isActive ? "Active" : "Inactive"}</span>
        </div>

        {error && <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        {success && <p className="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</p>}

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
