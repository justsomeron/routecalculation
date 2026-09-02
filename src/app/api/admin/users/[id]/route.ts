import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  role: z.enum(["ADMIN", "DISPATCHER"]).optional(),
  active: z.boolean().optional(),
  name: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  if (id === currentUser.id && parsed.data.active === false) {
    return NextResponse.json(
      { error: "Du kannst dich nicht selbst deaktivieren." },
      { status: 400 },
    );
  }
  if (
    id === currentUser.id &&
    parsed.data.role &&
    parsed.data.role !== "ADMIN"
  ) {
    return NextResponse.json(
      { error: "Du kannst dir nicht selbst die Admin-Rolle entziehen." },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, user: { ...user, passwordHash: undefined } });
}
