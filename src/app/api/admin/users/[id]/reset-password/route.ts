import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/tokens";
import { sendInviteMail, sendPasswordResetMail } from "@/lib/mail";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json(
      { error: "Benutzer nicht gefunden" },
      { status: 404 },
    );
  }

  if (!user.passwordHash) {
    const raw = await createToken(user.id, "INVITE");
    const url = `${process.env.APP_URL}/set-password?token=${raw}`;
    await sendInviteMail(user.email, user.name, url);
  } else {
    const raw = await createToken(user.id, "PASSWORD_RESET");
    const url = `${process.env.APP_URL}/set-password?token=${raw}`;
    await sendPasswordResetMail(user.email, user.name, url);
  }

  return NextResponse.json({ ok: true });
}
