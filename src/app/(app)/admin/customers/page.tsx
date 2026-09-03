"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Customer = {
  id: string;
  name: string;
  notes: string | null;
  active: boolean;
  _count: { organizations: number };
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/customers");
    if (res.ok) setCustomers(await res.json());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Anlegen");
        return;
      }
      setName("");
      setNotes("");
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(c: Customer) {
    await fetch(`/api/admin/customers/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    await refresh();
  }

  async function remove(c: Customer) {
    if (!confirm(`Kunde "${c.name}" wirklich löschen?`)) return;
    await fetch(`/api/admin/customers/${c.id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Kunden</h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        Kunden, für die Transporteure fahren können. Nicht jeder Verband fährt
        für jeden Kunden.
      </p>

      <form
        onSubmit={create}
        className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:grid-cols-3"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Name
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Notiz (optional)
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Anlegen…" : "Kunde anlegen"}
          </button>
        </div>
        {error && <p className="col-span-full text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Transporteure</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="hover:underline"
                  >
                    {c.name}
                  </Link>
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Puffer bearbeiten →
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {c._count.organizations}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.active
                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {c.active ? "Aktiv" : "Inaktiv"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(c)}
                      className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      {c.active ? "Deaktivieren" : "Aktivieren"}
                    </button>
                    <button
                      onClick={() => remove(c)}
                      className="rounded-md border border-red-300 dark:border-red-700 px-2 py-1 text-xs text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900"
                    >
                      Löschen
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
