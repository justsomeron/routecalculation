import "server-only";
import nodemailer from "nodemailer";

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

export async function sendInviteMail(to: string, name: string, url: string) {
  await sendMail(
    to,
    "Einladung – Medical Operations Center",
    `<p>Hallo ${name},</p>
     <p>du wurdest für das Medical Operations Center eingeladen. Bitte lege über den folgenden Link dein Passwort fest:</p>
     <p><a href="${url}">${url}</a></p>
     <p>Der Link ist 72 Stunden gültig.</p>`,
  );
}

export async function sendPasswordResetMail(
  to: string,
  name: string,
  url: string,
) {
  await sendMail(
    to,
    "Passwort zurücksetzen – Medical Operations Center",
    `<p>Hallo ${name},</p>
     <p>für dein Konto wurde ein Zurücksetzen des Passworts angefordert. Falls du das warst, klicke auf den folgenden Link:</p>
     <p><a href="${url}">${url}</a></p>
     <p>Der Link ist 2 Stunden gültig. Falls du das nicht warst, ignoriere diese E-Mail.</p>`,
  );
}
