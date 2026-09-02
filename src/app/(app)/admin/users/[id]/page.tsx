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
          candidates: { orderBy: { rank: "asc" }, take: 1 },
        },
      },
    },
  });

  if (!user) notFound();

  return (
    <div>
      <Link
        href="/admin/users"
        className="text-sm text-blue-600 hover:underline"
      >
        ← Zurück zur Benutzerverwaltung
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        {user.name}
      </h1>
      <p className="text-slate-500">
        {user.email} · {user.role === "ADMIN" ? "Administrator" : "Disponent"}
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">
        Anfrageverlauf ({user.routeRequests.length})
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">Ziel</th>
              <th className="px-4 py-3">Fahrzeug</th>
              <th className="px-4 py-3">Kunde</th>
              <th className="px-4 py-3">Bester Transporteur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {user.routeRequests.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  Noch keine Anfragen erfasst.
                </td>
              </tr>
            )}
            {user.routeRequests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-slate-600">
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
                </td>
                <td className="px-4 py-3">{r.customer?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {r.candidates[0]
                    ? `${r.candidates[0].organizationName} (${Math.round(
                        r.candidates[0].totalRoundTripM / 1000,
                      )} km)`
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
