import { prisma } from "@/lib/prisma";
import { RoutePlanner } from "@/components/RoutePlanner";

export default async function DashboardPage() {
  const customers = await prisma.customer.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Routenkalkulation
      </h1>
      <div className="mt-6">
        <RoutePlanner customers={customers} />
      </div>
    </div>
  );
}
