"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-700">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-8 shadow-md">
        <h1 className="mb-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Passwort vergessen
        </h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Gib deine E-Mail-Adresse ein. Falls ein Konto existiert, senden wir
          dir einen Link zum Zurücksetzen.
        </p>
        {done ? (
          <p className="rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-800 dark:text-green-300">
            Falls ein Konto mit dieser E-Mail existiert, wurde eine Nachricht
            versendet.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                E-Mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Senden…" : "Link anfordern"}
            </button>
          </form>
        )}
        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Zurück zum Login
          </Link>
        </div>
      </div>
    </div>
  );
}
