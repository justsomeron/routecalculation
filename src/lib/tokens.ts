import "server-only";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { TokenPurpose } from "@prisma/client";

const TOKEN_TTL_HOURS: Record<TokenPurpose, number> = {
  INVITE: 72,
  PASSWORD_RESET: 2,
};

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createToken(userId: string, purpose: TokenPurpose) {
  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(
    Date.now() + TOKEN_TTL_HOURS[purpose] * 60 * 60 * 1000,
  );

  await prisma.token.deleteMany({
    where: { userId, purpose, usedAt: null },
  });

  await prisma.token.create({
    data: { userId, purpose, tokenHash, expiresAt },
  });

  return raw;
}

export async function consumeToken(raw: string, purpose: TokenPurpose) {
  const tokenHash = hashToken(raw);
  const token = await prisma.token.findUnique({ where: { tokenHash } });
  if (
    !token ||
    token.purpose !== purpose ||
    token.usedAt ||
    token.expiresAt < new Date()
  ) {
    return null;
  }
  await prisma.token.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });
  return token;
}
