import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const offset = Number(req.nextUrl.searchParams.get("offset") ?? 0);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 5);

  const candidates = await prisma.routeRequestCandidate.findMany({
    where: { routeRequestId: id },
    orderBy: { rank: "asc" },
    skip: offset,
    take: limit,
    include: { organization: true },
  });

  const total = await prisma.routeRequestCandidate.count({
    where: { routeRequestId: id },
  });

  return NextResponse.json({ candidates, total });
}
