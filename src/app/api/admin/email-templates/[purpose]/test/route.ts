import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { sendMail, renderTemplate } from "@/lib/mail";
import { UserFacingError } from "@/lib/errors";
import type { TokenPurpose } from "@prisma/client";

const VALID_PURPOSES: TokenPurpose[] = ["INVITE", "PASSWORD_RESET"];

const schema = z.object({
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
});

function isValidPurpose(value: string): value is TokenPurpose {
  return VALID_PURPOSES.includes(value as TokenPurpose);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ purpose: string }> },
) {
  const { purpose } = await params;
  if (!isValidPurpose(purpose)) {
    return NextResponse.json({ error: "Unbekannter Vorlagentyp" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
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

  const vars = {
    name: user.name,
    url: `${process.env.APP_URL ?? "https://beispiel.de"}/set-password?token=beispiel-token-fuer-testmail`,
  };

  try {
    await sendMail(
      user.email,
      `[Test] ${renderTemplate(parsed.data.subject, vars)}`,
      renderTemplate(parsed.data.bodyHtml, vars),
    );
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Versand fehlgeschlagen" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, sentTo: user.email });
}
