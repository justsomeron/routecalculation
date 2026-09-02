import { prisma } from "@/lib/prisma";
import { UsersManager } from "./UsersManager";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      passwordHash: true,
      createdAt: true,
      _count: { select: { routeRequests: true } },
    },
  });

  const initialUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
    hasSetPassword: !!u.passwordHash,
    createdAt: u.createdAt.toISOString(),
    requestCount: u._count.routeRequests,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Benutzerverwaltung
      </h1>
      <p className="mt-1 text-slate-500">
        Disponenten einladen, Rollen verwalten und Passwörter zurücksetzen.
      </p>
      <UsersManager initialUsers={initialUsers} />
    </div>
  );
}
