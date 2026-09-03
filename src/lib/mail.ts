import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import type { TokenPurpose } from "@prisma/client";

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
  });
}

export async function sendMail(to: string, subject: string, html: string) {
  const transport = getTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

// Standardtexte, falls ein Administrator die Vorlage noch nicht angepasst
// hat (siehe /admin/email-templates). {{name}} und {{url}} werden beim
// Versand ersetzt.
export const DEFAULT_EMAIL_TEMPLATES: Record<
  TokenPurpose,
  { subject: string; bodyHtml: string }
> = {
  INVITE: {
    subject: "Einladung – Medical Operations Center",
    bodyHtml: `<p>Hallo {{name}},</p>
     <p>du wurdest für das Medical Operations Center eingeladen. Bitte lege über den folgenden Link dein Passwort fest:</p>
     <p><a href="{{url}}">{{url}}</a></p>
     <p>Der Link ist 72 Stunden gültig.</p>`,
  },
  PASSWORD_RESET: {
    subject: "Passwort zurücksetzen – Medical Operations Center",
    bodyHtml: `<p>Hallo {{name}},</p>
     <p>für dein Konto wurde ein Zurücksetzen des Passworts angefordert. Falls du das warst, klicke auf den folgenden Link:</p>
     <p><a href="{{url}}">{{url}}</a></p>
     <p>Der Link ist 2 Stunden gültig. Falls du das nicht warst, ignoriere diese E-Mail.</p>`,
  },
};

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export async function getEffectiveEmailTemplate(purpose: TokenPurpose) {
  const custom = await prisma.emailTemplate.findUnique({ where: { purpose } });
  return custom ?? DEFAULT_EMAIL_TEMPLATES[purpose];
}

async function sendTemplatedMail(
  purpose: TokenPurpose,
  to: string,
  vars: Record<string, string>,
) {
  const template = await getEffectiveEmailTemplate(purpose);
  await sendMail(
    to,
    renderTemplate(template.subject, vars),
    renderTemplate(template.bodyHtml, vars),
  );
}

export async function sendInviteMail(to: string, name: string, url: string) {
  await sendTemplatedMail("INVITE", to, { name, url });
}

export async function sendPasswordResetMail(
  to: string,
  name: string,
  url: string,
) {
  await sendTemplatedMail("PASSWORD_RESET", to, { name, url });
}
