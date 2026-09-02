import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/tokens";
import { sendPasswordResetMail } from "@/lib/mail";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  // Immer denselben Erfolg zurückgeben, um keine Rückschlüsse auf existierende Konten zuzulassen.
  if (user && user.active) {
    const raw = await createToken(user.id, "PASSWORD_RESET");
    const url = `${process.env.APP_URL}/set-password?token=${raw}`;
    await sendPasswordResetMail(user.email, user.name, url).catch((err) => {
      console.error("Fehler beim Versand der Passwort-Reset-Mail", err);
    });
  }

  return NextResponse.json({ ok: true });
}
