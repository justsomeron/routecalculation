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

export default async function StatisticsPage() {
  const [total, last30Days, byVehicle, topOrganizations, recent] =
    await Promise.all([
      prisma.routeRequest.count(),
      prisma.routeRequest.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.routeRequest.groupBy({
        by: ["vehicleType"],
        _count: { _all: true },
        orderBy: { _count: { vehicleType: "desc" } },
      }),
      prisma.routeRequestCandidate.groupBy({
        by: ["organizationName"],
        where: { rank: 0 },
        _count: { _all: true },
        orderBy: { _count: { organizationName: "desc" } },
        take: 5,
      }),
      prisma.routeRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          requestedBy: true,
          customer: true,
          candidates: {
            where: { rank: { lt: 3 } },
            orderBy: { rank: "asc" },
          },
        },
      }),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Statistik &amp; Anfrageverlauf
      </h1>
      <p className="mt-1 text-slate-500">
        Auswertung aller Routenanfragen für statistische Erhebungen.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Anfragen gesamt</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{total}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Letzte 30 Tage</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {last30Days}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:col-span-2">
          <p className="text-xs uppercase text-slate-500">Nach Fahrzeugtyp</p>
          <p className="mt-1 text-sm text-slate-700">
            {byVehicle
              .map(
                (v) =>
                  `${vehicleLabels[v.vehicleType] ?? v.vehicleType}: ${v._count._all}`,
              )
              .join(" · ") || "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs uppercase text-slate-500">
          Am häufigsten wirtschaftlichster Transporteur
        </p>
        <div className="flex flex-wrap gap-2">
          {topOrganizations.map((o) => (
            <span
              key={o.organizationName}
              className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
            >
              {o.organizationName} ({o._count._all}×)
            </span>
          ))}
          {topOrganizations.length === 0 && (
            <span className="text-sm text-slate-400">Noch keine Daten.</span>
          )}
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">
        Letzte Anfragen ({recent.length})
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Disponent</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">Ziel</th>
              <th className="px-4 py-3">Fahrzeug</th>
              <th className="px-4 py-3">Kunde</th>
              <th className="px-4 py-3">Top 3 Transporteure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recent.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-slate-600">
                  {new Intl.DateTimeFormat("de-DE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(r.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${r.requestedBy.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {r.requestedBy.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.startAddress}</td>
                <td className="px-4 py-3">{r.destinationAddress}</td>
                <td className="px-4 py-3">
                  {vehicleLabels[r.vehicleType]}
                  {r.needsDoctor ? " · Arzt" : ""}
                  {r.needsTemperingMattress ? " · Tempurmatratze" : ""}
                  {r.isEmergency && (
                    <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Notfall
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{r.customer?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
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
            {recent.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Noch keine Anfragen erfasst.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
