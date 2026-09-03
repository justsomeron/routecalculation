"use client";

import { useEffect, useState } from "react";

type TokenPurpose = "INVITE" | "PASSWORD_RESET";

type Template = {
  purpose: TokenPurpose;
  subject: string;
  bodyHtml: string;
  isCustomized: boolean;
  defaultSubject: string;
  defaultBodyHtml: string;
  updatedAt: string | null;
};

const purposeLabels: Record<TokenPurpose, string> = {
  INVITE: "Einladung (neuer Benutzer)",
  PASSWORD_RESET: "Passwort zurücksetzen",
};

const PREVIEW_VARS = {
  name: "Max Mustermann",
  url: "https://beispiel.de/set-password?token=beispiel-token",
};

function renderPreview(template: string) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    (PREVIEW_VARS as Record<string, string>)[key] ?? "",
  );
}

function TemplateEditor({
  template,
  onSaved,
}: {
  template: Template;
  onSaved: (updated: Template) => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const dirty = subject !== template.subject || bodyHtml !== template.bodyHtml;

  async function save() {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${template.purpose}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, bodyHtml }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setMessage("Gespeichert.");
      onSaved({
        ...template,
        subject,
        bodyHtml,
        isCustomized: true,
        updatedAt: data.updatedAt,
      });
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault() {
    setError(null);
    setMessage(null);
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${template.purpose}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Zurücksetzen fehlgeschlagen.");
        return;
      }
      setSubject(data.subject);
      setBodyHtml(data.bodyHtml);
      setMessage("Auf Standard zurückgesetzt.");
      onSaved({
        ...template,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        isCustomized: false,
        updatedAt: null,
      });
    } finally {
      setResetting(false);
    }
  }

  async function sendTest() {
    setError(null);
    setMessage(null);
    setTesting(true);
    try {
      const res = await fetch(
        `/api/admin/email-templates/${template.purpose}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, bodyHtml }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Test-E-Mail konnte nicht versendet werden.");
        return;
      }
      setMessage(`Test-E-Mail wurde an ${data.sentTo} versendet.`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {purposeLabels[template.purpose]}
        </h2>
        {template.isCustomized ? (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            angepasst
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            Standard
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Betreff
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Inhalt (HTML)
            </label>
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={12}
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none dark:border-slate-600"
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Platzhalter: <code>{"{{name}}"}</code>, <code>{"{{url}}"}</code>{" "}
              (Pflicht, sonst fehlt der Link in der E-Mail).
            </p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Vorschau (mit Beispielwerten)
          </p>
          <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-600">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Betreff: {renderPreview(subject)}
            </div>
            <iframe
              title="Vorschau"
              sandbox=""
              srcDoc={renderPreview(bodyHtml)}
              className="h-64 w-full bg-white"
            />
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && !error && (
        <p className="mt-3 text-sm text-green-700 dark:text-green-400">{message}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Speichert…" : "Speichern"}
        </button>
        <button
          type="button"
          onClick={sendTest}
          disabled={testing}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {testing ? "Sendet…" : "Test-E-Mail an mich senden"}
        </button>
        {template.isCustomized && (
          <button
            type="button"
            onClick={resetToDefault}
            disabled={resetting}
            className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900"
          >
            {resetting ? "Setzt zurück…" : "Auf Standard zurücksetzen"}
          </button>
        )}
      </div>
    </div>
  );
}

export function EmailTemplatesClient() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/email-templates")
      .then((res) => res.json())
      .then(setTemplates)
      .catch(() => setLoadError("Vorlagen konnten nicht geladen werden."));
  }, []);

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }
  if (!templates) {
    return <p className="text-sm text-slate-400">Lädt…</p>;
  }

  return (
    <div className="space-y-6">
      {templates.map((t) => (
        <TemplateEditor
          key={t.purpose}
          template={t}
          onSaved={(updated) =>
            setTemplates((prev) =>
              prev
                ? prev.map((p) => (p.purpose === updated.purpose ? updated : p))
                : prev,
            )
          }
        />
      ))}
    </div>
  );
}
