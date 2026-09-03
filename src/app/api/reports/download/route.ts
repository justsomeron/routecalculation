import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getReportData } from "@/lib/reportData";
import { renderReportPdf } from "@/lib/reportPdf";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "BUSINESS_DEVELOPMENT")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const title = req.nextUrl.searchParams.get("title") ?? "Report";

  const from = fromParam ? new Date(fromParam) : null;
  const to = toParam ? new Date(toParam) : null;
  if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "Ungültiger Zeitraum" }, { status: 400 });
  }

  // Bis-Datum bis zum Ende des Tages einschließen.
  to.setHours(23, 59, 59, 999);

  const data = await getReportData({ from, to });
  const pdfBuffer = await renderReportPdf(data, title);

  const filename = `${title.replace(/[^a-zA-Z0-9-_]+/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
