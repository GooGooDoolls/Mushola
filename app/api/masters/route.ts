import { NextResponse } from "next/server";
import { readSheet } from "@/lib/google-sheets";
export const dynamic = "force-dynamic";

function extractValues(rows: string[][], preferred: string[]) {
  if (!rows.length) return [];
  const headers = rows[0].map(h => String(h || "").trim().toUpperCase());
  let column = preferred.map(name => headers.indexOf(name)).find(i => i >= 0);
  if (column === undefined) column = 0;
  const activeColumn = headers.findIndex(h => ["AKTIF", "ACTIVE", "STATUS"].includes(h));
  return rows.slice(1)
    .filter(row => row[column]?.trim())
    .filter(row => {
      if (activeColumn < 0) return true;
      const status = String(row[activeColumn] ?? "").trim().toUpperCase();
      return !status || ["Y", "YA", "YES", "TRUE", "AKTIF", "ACTIVE", "1"].includes(status);
    })
    .map(row => String(row[column]).trim())
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

export async function GET() {
  try {
    const [kategoriRows, sumberDanaRows, transaksiRows] = await Promise.all([
      readSheet("05_MASTER_KATEGORI"),
      readSheet("06_SUMBER_DANA"),
      readSheet("01_TRANSAKSI_UANG")
    ]);
    return NextResponse.json({
      success: true,
      kategori: extractValues(kategoriRows, ["KATEGORI", "NAMA_KATEGORI", "NAMA"]),
      sumberDana: extractValues(sumberDanaRows, ["SUMBER_DANA", "NAMA_SUMBER_DANA", "NAMA"]),
      pic: extractValues(transaksiRows, ["PIC_PENCATAT", "PIC", "NAMA_PIC", "NAMA"])
    });
  } catch (error) {
    console.error("GET /api/masters failed", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}