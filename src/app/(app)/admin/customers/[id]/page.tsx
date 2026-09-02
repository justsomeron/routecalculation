import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CustomerBufferSettings } from "./CustomerBufferSettings";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { bufferTiers: { orderBy: { minKm: "asc" } } },
  });

  if (!customer) notFound();

  return (
    <div>
      <Link
        href="/admin/customers"
        className="text-sm text-blue-600 hover:underline"
      >
        ← Zurück zur Kundenverwaltung
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        {customer.name}
      </h1>
      <p className="text-slate-500">Puffer-Einstellungen für diesen Kunden</p>

      <div className="mt-6 max-w-2xl">
        <CustomerBufferSettings
          customerId={customer.id}
          initialBufferMode={customer.bufferMode}
          initialTiers={customer.bufferTiers.map((t) => ({
            minKm: t.minKm,
            maxKm: t.maxKm,
            bufferKm: t.bufferKm,
          }))}
        />
      </div>
    </div>
  );
}
