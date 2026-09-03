import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/mail";
import type { TokenPurpose } from "@prisma/client";

const VALID_PURPOSES: TokenPurpose[] = ["INVITE", "PASSWORD_RESET"];

const schema = z.object({
  subject: z.string().min(1, "Betreff darf nicht leer sein"),
  bodyHtml: z
    .string()
    .min(1, "Inhalt darf nicht leer sein")
    .refine((v) => v.includes("{{url}}"), {
      message: "Der Platzhalter {{url}} muss enthalten sein, sonst fehlt der Link in der E-Mail.",
    }),
});

function isValidPurpose(value: string): value is TokenPurpose {
  return VALID_PURPOSES.includes(value as TokenPurpose);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ purpose: string }> },
) {
  const { purpose } = await params;
  if (!isValidPurpose(purpose)) {
    return NextResponse.json({ error: "Unbekannter Vorlagentyp" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 },
    );
  }

  const template = await prisma.emailTemplate.upsert({
    where: { purpose },
    update: parsed.data,
    create: { purpose, ...parsed.data },
  });

  return NextResponse.json({ ok: true, updatedAt: template.updatedAt });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ purpose: string }> },
) {
  const { purpose } = await params;
  if (!isValidPurpose(purpose)) {
    return NextResponse.json({ error: "Unbekannter Vorlagentyp" }, { status: 404 });
  }

  await prisma.emailTemplate.deleteMany({ where: { purpose } });
  const def = DEFAULT_EMAIL_TEMPLATES[purpose];

  return NextResponse.json({ ok: true, ...def });
}
