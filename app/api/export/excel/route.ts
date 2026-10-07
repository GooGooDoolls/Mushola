import { NextResponse } from "next/server";
import { readTransactions } from "@/lib/google-sheets";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await readTransactions();
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(rows);
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