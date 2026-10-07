import { NextResponse } from "next/server";
import { appendTransaction, readTransactions } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await readTransactions();
    return NextResponse.json({ success: true, sheet: "01_TRANSAKSI_UANG", rows });
  } catch (error) {
    console.error("GET /api/transactions failed", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const required = ["tanggal", "jenis", "kategori", "deskripsi", "nominal", "sumberDana", "tujuanDana", "metode", "pihakTerkait", "pic", "noRef", "catatan"];

    for (const field of required) {
      if (body[field] === undefined) {
        return NextResponse.json({ success: false, error: "Field " + field + " wajib diisi" }, { status: 400 });
      }
    }

    const rows = await readTransactions();
    const id = "TRX-" + String(Math.max(0, rows.length - 1) + 1).padStart(3, "0");

    const values = [
      id, body.tanggal, body.jenis, body.kategori, body.deskripsi, String(body.nominal),
      body.sumberDana, body.tujuanDana, body.metode, body.pihakTerkait, body.pic,
      body.noRef, body.catatan, new Date().toISOString()
    ];

    await appendTransaction(values);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("POST /api/transactions failed", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
