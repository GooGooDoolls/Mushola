import { NextResponse } from "next/server";
import { readTransactions } from "@/lib/google-sheets";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start") || "";
    const end = searchParams.get("end") || "";
    if (start && end && start > end) {
      return NextResponse.json({ success: false, error: "Periode tidak valid: tanggal mulai setelah tanggal akhir." }, { status: 400 });
    }

    const rows = await readTransactions();
    const header = rows[0] || [];
    const dateIndex = header.indexOf("TANGGAL");
    const filteredRows = dateIndex < 0 ? rows : [header, ...rows.slice(1).filter(row => {
      const date = String(row[dateIndex] || "").slice(0, 10);
      return (!start || date >= start) && (!end || date <= end);
    })];
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(filteredRows);
    XLSX.utils.book_append_sheet(workbook, sheet, "Transaksi");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Laporan-Keuangan-Mushola.xlsx"',
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("GET /api/export/excel failed", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Gagal membuat file Excel" },
      { status: 500 }
    );
  }
}