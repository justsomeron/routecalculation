"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

type Role = "ADMIN" | "DISPATCHER" | "BUSINESS_DEVELOPMENT";

type Props = {
  name: string;
  role: Role;
};

const adminLinks = [
  { href: "/admin/organizations", label: "Transporteure" },
  { href: "/admin/customers", label: "Kunden" },
  { href: "/admin/users", label: "Benutzer" },
  { href: "/admin/statistics", label: "Statistik" },
  { href: "/admin/settings", label: "Puffer-Einstellungen" },
];

export function AppNav({ name, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminOpen, setAdminOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        adminMenuRef.current &&
        !adminMenuRef.current.contains(e.target as Node)
      ) {
        setAdminOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    setAdminOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isAdminSection = pathname.startsWith("/admin");
  const linkClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      active
        ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
    }`;

  return (
    <header className="relative z-[2000] border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-semibold text-slate-900 dark:text-slate-100"
          >
            Medical Operations Center
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/" className={linkClass(pathname === "/")}>
              Routenkalkulation
            </Link>

            {(role === "ADMIN" || role === "BUSINESS_DEVELOPMENT") && (
              <Link
                href="/reports"
                className={linkClass(pathname === "/reports")}
              >
                Reports
              </Link>
            )}

            {role === "ADMIN" && (
              <div className="relative" ref={adminMenuRef}>
                <button
                  type="button"
                  onClick={() => setAdminOpen((v) => !v)}
                  className={linkClass(isAdminSection) + " flex items-center gap-1"}
                >
                  Administration
                  <span
                    className={`text-xs transition-transform ${adminOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>
                {adminOpen && (
                  <div className="absolute left-0 z-[2000] mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    {adminLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={`block px-4 py-2 text-sm ${
                          pathname === l.href
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/einstellungen"
            className={linkClass(pathname === "/einstellungen")}
          >
            Einstellungen
          </Link>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {name}
          </span>
          <button
            onClick={logout}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>
  );
}
