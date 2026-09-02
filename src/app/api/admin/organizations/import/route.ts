import { NextRequest, NextResponse } from "next/server";
import { importOrganizationsFromBuffer } from "@/lib/organizationImport";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Keine Datei übermittelt." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const results = await importOrganizationsFromBuffer(buffer);

  return NextResponse.json({
    ok: true,
    summary: {
      total: results.length,
      created: results.filter((r) => r.status === "created").length,
      updated: results.filter((r) => r.status === "updated").length,
      errors: results.filter((r) => r.status === "error").length,
    },
    results,
  });
}
