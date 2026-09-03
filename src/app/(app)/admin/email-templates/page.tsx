import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { EmailTemplatesClient } from "./EmailTemplatesClient";

export default async function EmailTemplatesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        E-Mail-Vorlagen
      </h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        Texte der System-E-Mails (Einladung, Passwort zurücksetzen) anpassen.
        Verfügbare Platzhalter: <code>{"{{name}}"}</code> (Name des
        Empfängers) und <code>{"{{url}}"}</code> (Link zum Passwort setzen).
      </p>
      <div className="mt-6">
        <EmailTemplatesClient />
      </div>
    </div>
  );
}
