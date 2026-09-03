"use client";

import { useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

function endOfYear(d: Date) {
  return new Date(d.getFullYear(), 11, 31);
}

type Preset =
  | "month-to-date"
  | "last-month"
  | "year-to-date"
  | "last-year"
  | "custom";

const presetLabels: Record<Preset, string> = {
  "month-to-date": "Dieser Monat (bis heute)",
  "last-month": "Letzter Monat (komplett)",
  "year-to-date": "Dieses Jahr (bis heute)",
  "last-year": "Letztes Jahr (komplett)",
  custom: "Benutzerdefinierter Zeitraum",
};

function rangeForPreset(preset: Preset, today: Date): { from: Date; to: Date } {
  switch (preset) {
    case "month-to-date":
      return { from: startOfMonth(today), to: today };
    case "last-month": {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case "year-to-date":
      return { from: startOfYear(today), to: today };
    case "last-year": {
      const lastYear = new Date(today.getFullYear() - 1, 0, 1);
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
    }
    case "custom":
      return { from: startOfMonth(today), to: today };
  }
}

export function ReportsClient() {
  const today = new Date();
  const [preset, setPreset] = useState<Preset>("month-to-date");
  const initialRange = rangeForPreset("month-to-date", today);
  const [from, setFrom] = useState(toDateInputValue(initialRange.from));
  const [to, setTo] = useState(toDateInputValue(initialRange.to));

  function selectPreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") {
      const r = rangeForPreset(p, today);
      setFrom(toDateInputValue(r.from));
      setTo(toDateInputValue(r.to));
    }
  }

  const title = `Report ${from} bis ${to}`;
  const downloadUrl = `/api/reports/download?from=${from}&to=${to}&title=${encodeURIComponent(title)}`;

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div>
        <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">Zeitraum</p>
        <div className="space-y-1.5">
          {(Object.keys(presetLabels) as Preset[]).map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="preset"
                checked={preset === p}
                onChange={() => selectPreset(p)}
              />
              {presetLabels[p]}
            </label>
          ))}
        </div>
      </div>

      {preset === "custom" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Von
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Bis
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Zeitraum: {from} bis {to}
      </p>

      <a
        href={downloadUrl}
        className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
      >
        Report als PDF herunterladen
      </a>
    </div>
  );
}
