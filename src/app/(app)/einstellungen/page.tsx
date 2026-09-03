import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EinstellungenClient } from "./EinstellungenClient";

export default async function EinstellungenPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Einstellungen
      </h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        Angemeldet als {user.name} ({user.email})
      </p>
      <div className="mt-6 max-w-md">
        <EinstellungenClient />
      </div>
    </div>
  );
}
