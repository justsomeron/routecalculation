"use client";

import { useState } from "react";
import Link from "next/link";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "DISPATCHER";
  active: boolean;
  hasSetPassword: boolean;
  createdAt: string;
  requestCount: number;
};

export function UsersManager({
  initialUsers,
}: {
  initialUsers: UserRow[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "DISPATCHER">("DISPATCHER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Einladen");
        return;
      }
      setEmail("");
      setName("");
      setRole("DISPATCHER");
      setShowInvite(false);
      setNotice(`Einladung an ${data.user.email} versendet.`);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(u: UserRow) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    if (res.ok) await refresh();
  }

  async function changeRole(u: UserRow, newRole: "ADMIN" | "DISPATCHER") {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) await refresh();
  }

  async function resetPassword(u: UserRow) {
    const res = await fetch(`/api/admin/users/${u.id}/reset-password`, {
      method: "POST",
    });
    if (res.ok) {
      setNotice(
        u.hasSetPassword
          ? `Passwort-Reset-Mail an ${u.email} gesendet.`
          : `Einladungs-Mail erneut an ${u.email} gesendet.`,
      );
    }
  }

  return (
    <div className="mt-6">
      {notice && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </div>
      )}

      <div className="mb-4 flex justify-between">
        <Link
          href="/admin/statistics"
          className="text-sm text-blue-600 hover:underline"
        >
          Zur Statistik-/Logging-Auswertung →
        </Link>
        <button
          onClick={() => setShowInvite((s) => !s)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showInvite ? "Abbrechen" : "Benutzer einladen"}
        </button>
      </div>

      {showInvite && (
        <form
          onSubmit={invite}
          className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              E-Mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Rolle
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "DISPATCHER")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="DISPATCHER">Disponent</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Sende Einladung…" : "Einladen"}
            </button>
          </div>
          {error && (
            <p className="col-span-full text-sm text-red-600">{error}</p>
          )}
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">E-Mail</th>
              <th className="px-4 py-3">Rolle</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Anfragen</th>
              <th className="px-4 py-3">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="hover:underline"
                  >
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      changeRole(u, e.target.value as "ADMIN" | "DISPATCHER")
                    }
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="DISPATCHER">Disponent</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {u.active ? "Aktiv" : "Deaktiviert"}
                  </span>
                  {!u.hasSetPassword && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Einladung ausstehend
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{u.requestCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => resetPassword(u)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      {u.hasSetPassword ? "Passwort zurücksetzen" : "Einladung erneut senden"}
                    </button>
                    <button
                      onClick={() => toggleActive(u)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      {u.active ? "Deaktivieren" : "Aktivieren"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
