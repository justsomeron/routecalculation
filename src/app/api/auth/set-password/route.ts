import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";
import { hashPassword, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;

  let consumed = await consumeToken(token, "INVITE");
  if (!consumed) {
    consumed = await consumeToken(token, "PASSWORD_RESET");
  }

  if (!consumed) {
    return NextResponse.json(
      { error: "Der Link ist ungültig oder abgelaufen." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.update({
    where: { id: consumed.userId },
    data: { passwordHash },
  });

  await setSessionCookie({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return NextResponse.json({ ok: true });
}
