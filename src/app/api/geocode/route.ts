import { NextRequest, NextResponse } from "next/server";
import { searchAddress } from "@/lib/geocode";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchAddress(q);
  return NextResponse.json(results);
}
