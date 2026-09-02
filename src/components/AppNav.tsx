"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  name: string;
  role: "ADMIN" | "DISPATCHER";
};

const links = [
  { href: "/", label: "Routenkalkulation" },
  { href: "/admin/organizations", label: "Transporteure", adminOnly: true },
  { href: "/admin/customers", label: "Kunden", adminOnly: true },
  { href: "/admin/users", label: "Benutzer", adminOnly: true },
  { href: "/admin/statistics", label: "Statistik", adminOnly: true },
];

export function AppNav({ name, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <span className="font-semibold text-slate-900">
            Medical Operations Center
          </span>
          <nav className="flex gap-1">
            {links
              .filter((l) => !l.adminOnly || role === "ADMIN")
              .map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    pathname === l.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            {name} · {role === "ADMIN" ? "Administrator" : "Disponent"}
          </span>
          <button
            onClick={logout}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>
  );
}
