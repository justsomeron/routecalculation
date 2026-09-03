import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/mail";
import type { TokenPurpose } from "@prisma/client";

const PURPOSES: TokenPurpose[] = ["INVITE", "PASSWORD_RESET"];

export async function GET() {
  const custom = await prisma.emailTemplate.findMany({
    where: { purpose: { in: PURPOSES } },
  });
  const customByPurpose = new Map(custom.map((c) => [c.purpose, c]));

  const templates = PURPOSES.map((purpose) => {
    const override = customByPurpose.get(purpose);
    const def = DEFAULT_EMAIL_TEMPLATES[purpose];
    return {
      purpose,
      subject: override?.subject ?? def.subject,
      bodyHtml: override?.bodyHtml ?? def.bodyHtml,
      isCustomized: !!override,
      defaultSubject: def.subject,
      defaultBodyHtml: def.bodyHtml,
      updatedAt: override?.updatedAt ?? null,
    };
  });

  return NextResponse.json(templates);
}
