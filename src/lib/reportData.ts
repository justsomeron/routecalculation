import "server-only";
import { prisma } from "@/lib/prisma";

export type ReportRange = { from: Date; to: Date };

const vehicleLabels: Record<string, string> = {
  PKW: "PKW",
  VAN: "VAN",
  KTW: "KTW",
  N_KTW: "N-KTW",
  RTW: "RTW",
  ITW: "ITW",
};

export async function getReportData(range: ReportRange) {
  const where = { createdAt: { gte: range.from, lte: range.to } };

  const [
    total,
    emergencyCount,
    byVehicleRaw,
    byCustomerRaw,
    topOrganizationsRaw,
    byDispatcherRaw,
    avgRoundTrip,
  ] = await Promise.all([
    prisma.routeRequest.count({ where }),
    prisma.routeRequest.count({ where: { ...where, isEmergency: true } }),
    prisma.routeRequest.groupBy({
      by: ["vehicleType"],
      where,
      _count: { _all: true },
      orderBy: { _count: { vehicleType: "desc" } },
    }),
    prisma.routeRequest.groupBy({
      by: ["customerId"],
      where,
      _count: { _all: true },
      orderBy: { _count: { customerId: "desc" } },
      take: 10,
    }),
    prisma.routeRequestCandidate.groupBy({
      by: ["organizationName"],
      where: { rank: 0, routeRequest: where },
      _count: { _all: true },
      orderBy: { _count: { organizationName: "desc" } },
      take: 10,
    }),
    prisma.routeRequest.groupBy({
      by: ["requestedById"],
      where,
      _count: { _all: true },
      orderBy: { _count: { requestedById: "desc" } },
      take: 10,
    }),
    prisma.routeRequestCandidate.aggregate({
      where: { rank: 0, routeRequest: where },
      _avg: { totalRoundTripWithBufferM: true },
    }),
  ]);

  const customerIds = byCustomerRaw
    .map((c) => c.customerId)
    .filter((id): id is string => !!id);
  const dispatcherIds = byDispatcherRaw.map((d) => d.requestedById);

  const [customers, dispatchers] = await Promise.all([
    prisma.customer.findMany({ where: { id: { in: customerIds } } }),
    prisma.user.findMany({ where: { id: { in: dispatcherIds } } }),
  ]);
  const customerName = new Map(customers.map((c) => [c.id, c.name]));
  const dispatcherName = new Map(dispatchers.map((d) => [d.id, d.name]));

  return {
    range,
    total,
    emergencyCount,
    avgRoundTripKm: avgRoundTrip._avg.totalRoundTripWithBufferM
      ? Math.ceil(avgRoundTrip._avg.totalRoundTripWithBufferM / 1000)
      : null,
    activeDispatchers: byDispatcherRaw.length,
    byVehicle: byVehicleRaw.map((v) => ({
      label: vehicleLabels[v.vehicleType] ?? v.vehicleType,
      count: v._count._all,
    })),
    byCustomer: byCustomerRaw.map((c) => ({
      label: c.customerId ? (customerName.get(c.customerId) ?? "Unbekannt") : "Kein Kunde",
      count: c._count._all,
    })),
    topOrganizations: topOrganizationsRaw.map((o) => ({
      label: o.organizationName,
      count: o._count._all,
    })),
    byDispatcher: byDispatcherRaw.map((d) => ({
      label: dispatcherName.get(d.requestedById) ?? "Unbekannt",
      count: d._count._all,
    })),
  };
}

export type ReportData = Awaited<ReturnType<typeof getReportData>>;
