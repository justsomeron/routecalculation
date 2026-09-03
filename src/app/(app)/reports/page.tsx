import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "BUSINESS_DEVELOPMENT")) {
    redirect("/");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Reports</h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        Monats-, Jahres- oder freier Zeitraum-Report als PDF – aufbereitet
        für Präsentationen (Kennzahlen, Diagramme, Top-Listen).
      </p>
      <div className="mt-6 max-w-xl">
        <ReportsClient />
      </div>
    </div>
  );
}
