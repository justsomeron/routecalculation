import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/tokens";
import { sendInviteMail } from "@/lib/mail";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "DISPATCHER", "BUSINESS_DEVELOPMENT"]),
});

export async function GET() {
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
  return NextResponse.json(
    users.map((u) => ({
      ...u,
      passwordHash: undefined,
      hasSetPassword: !!u.passwordHash,
    })),
  );
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 },
    );
  }

  const { email, name, role } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Es existiert bereits ein Konto mit dieser E-Mail." },
      { status: 409 },
    );
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      role,
      invitedById: currentUser.id,
    },
  });

  const raw = await createToken(user.id, "INVITE");
  const url = `${process.env.APP_URL}/set-password?token=${raw}`;
  await sendInviteMail(user.email, user.name, url).catch((err) => {
    console.error("Fehler beim Versand der Einladungs-Mail", err);
  });

  return NextResponse.json({ ok: true, user });
}
