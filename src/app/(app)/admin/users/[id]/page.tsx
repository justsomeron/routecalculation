import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const vehicleLabels: Record<string, string> = {
  PKW: "PKW",
  VAN: "VAN",
  KTW: "KTW",
  N_KTW: "N-KTW",
  RTW: "RTW",
  ITW: "ITW",
};

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  DISPATCHER: "Disponent",
  BUSINESS_DEVELOPMENT: "Business Development",
};

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      routeRequests: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          customer: true,
          candidates: {
            where: { rank: { lt: 3 } },
            orderBy: { rank: "asc" },
          },
        },
      },
    },
  });

  if (!user) notFound();

  return (
    <div>
      <Link
        href="/admin/users"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        ← Zurück zur Benutzerverwaltung
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {user.name}
      </h1>
      <p className="text-slate-500 dark:text-slate-400">
        {user.email} · {roleLabels[user.role] ?? user.role}
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Anfrageverlauf ({user.routeRequests.length})
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">Ziel</th>
              <th className="px-4 py-3">Fahrzeug</th>
              <th className="px-4 py-3">Kunde</th>
              <th className="px-4 py-3">Top 3 Transporteure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {user.routeRequests.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-400 dark:text-slate-500"
                >
                  Noch keine Anfragen erfasst.
                </td>
              </tr>
            )}
            {user.routeRequests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {new Intl.DateTimeFormat("de-DE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(r.createdAt)}
                </td>
                <td className="px-4 py-3">{r.startAddress}</td>
                <td className="px-4 py-3">{r.destinationAddress}</td>
                <td className="px-4 py-3">
                  {vehicleLabels[r.vehicleType]}
                  {r.needsDoctor ? " · Arzt" : ""}
                  {r.needsTemperingMattress ? " · Tempurmatratze" : ""}
                  {r.isEmergency && (
                    <span className="ml-1 rounded-full bg-red-100 dark:bg-red-900 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                      Notfall
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{r.customer?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {r.candidates.length > 0
                    ? r.candidates
                        .map(
                          (c, i) =>
                            `${i + 1}. ${c.organizationName} (${Math.ceil(
                              c.totalRoundTripWithBufferM / 1000,
                            )} km)`,
                        )
                        .join(" · ")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
