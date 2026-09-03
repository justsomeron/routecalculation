import { prisma } from "@/lib/prisma";
import { OrganizationsManager } from "./OrganizationsManager";

export default async function OrganizationsPage() {
  const [organizations, customers] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { name: "asc" },
      include: { customers: { include: { customer: true } } },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Transporteure</h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        Kreisverbände, Ortsvereine und externe Transporteure inkl.
        Fahrzeugausstattung, Ärzte, Tempurmatratze und Kunden-Zuordnung.
      </p>
      <OrganizationsManager
        initialOrganizations={JSON.parse(JSON.stringify(organizations))}
        customers={JSON.parse(JSON.stringify(customers))}
      />
    </div>
  );
}
