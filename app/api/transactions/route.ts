import { NextResponse } from "next/server";
import {
  appendTransaction,
  deleteTransaction,
  readTransactions,
  updateTransaction
} from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

const TYPES = ["PEMASUKAN", "PENGELUARAN", "TRANSFER"] as const;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function validateBody(body: Record<string, unknown>) {
  const required = [
    "tanggal", "jenis", "kategori", "deskripsi", "nominal",
    "sumberDana", "tujuanDana", "metode", "pihakTerkait",
    "pic", "noRef", "catatan"
  ];

  for (const field of required) {
    if (body[field] === undefined) return `Field ${field} wajib diisi`;
  }

  const jenis = clean(body.jenis);
  const nominal = numberValue(body.nominal);
  const sumber = clean(body.sumberDana);
  const tujuan = clean(body.tujuanDana);

  if (!clean(body.tanggal)) return "Tanggal wajib diisi";
  if (!TYPES.includes(jenis as typeof TYPES[number])) return "Jenis transaksi tidak valid";
  if (!clean(body.kategori)) return "Kategori wajib diisi";
  if (!clean(body.deskripsi)) return "Deskripsi wajib diisi";
  if (nominal <= 0) return "Nominal harus lebih besar dari 0";
  if (!sumber) return "Sumber dana wajib diisi";

  if (jenis === "TRANSFER") {
    if (!tujuan) return "Tujuan dana wajib diisi untuk transfer";
    if (sumber.toLowerCase() === tujuan.toLowerCase()) {
      return "Sumber dan tujuan dana tidak boleh sama";
    }
  } else if (tujuan) {
    return "Tujuan dana hanya boleh diisi untuk transaksi TRANSFER";
  }

  return null;
}

function rowToObject(row: string[]) {
  return {
    id: row[0] || "",
    tanggal: row[1] || "",
    jenis: row[2] || "",
    kategori: row[3] || "",
    deskripsi: row[4] || "",
    nominal: numberValue(row[5]),
    sumberDana: row[6] || "",
    tujuanDana: row[7] || "",
    metode: row[8] || "",
    pihakTerkait: row[9] || "",
    pic: row[10] || "",
    noRef: row[11] || "",
    catatan: row[12] || "",
    createdAt: row[13] || ""
  };
}

function getBalances(rows: string[], excludeId?: string) {
  const lines = rows.slice(1);
  const balances: Record<string, number> = {};

  for (const row of lines) {
    if (!row.length) continue;
    const tx = rowToObject(row);
    if (!tx.id || tx.id === excludeId) continue;

    const source = tx.sumberDana.trim();
    const target = tx.tujuanDana.trim();

    if (tx.jenis === "SALDO_AWAL") {
      if (source) balances[source] = (balances[source] || 0) + tx.nominal;
    } else if (tx.jenis === "PEMASUKAN") {
      if (source) balances[source] = (balances[source] || 0) + tx.nominal;
    } else if (tx.jenis === "PENGELUARAN") {
      if (source) balances[source] = (balances[source] || 0) - tx.nominal;
    } else if (tx.jenis === "TRANSFER") {
      if (source) balances[source] = (balances[source] || 0) - tx.nominal;
      if (target) balances[target] = (balances[target] || 0) + tx.nominal;
    }
  }

  return balances;
}

function buildValues(body: Record<string, unknown>, id: string, createdAt: string) {
  return [
    id,
    clean(body.tanggal),
    clean(body.jenis),
    clean(body.kategori),
    clean(body.deskripsi),
    String(numberValue(body.nominal)),
    clean(body.sumberDana),
    clean(body.tujuanDana),
    clean(body.metode),
    clean(body.pihakTerkait),
    clean(body.pic),
    clean(body.noRef),
    clean(body.catatan),
    createdAt
  ];
}

function findRow(rows: string[][], id: string) {
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id);
  return rowIndex === -1 ? null : { rowIndex, rowNumber: rowIndex + 1 };
}

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
    const body = await request.json() as Record<string, unknown>;
    const validation = validateBody(body);
    if (validation) return errorResponse(validation);

    const rows = await readTransactions();
    const balances = getBalances(rows);
    const jenis = clean(body.jenis);
    const sumber = clean(body.sumberDana);
    const nominal = numberValue(body.nominal);

    if ((jenis === "PENGELUARAN" || jenis === "TRANSFER") && (balances[sumber] || 0) < nominal) {
      return errorResponse(
        `Saldo ${sumber} tidak cukup. Saldo tersedia ${(balances[sumber] || 0).toLocaleString("id-ID")}, transaksi ${nominal.toLocaleString("id-ID")}.`
      );
    }

    const ids = rows.slice(1).map(row => row[0] || "");
    const used = new Set(ids);
    let id = "";
    do {
      id = `TRX-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    } while (used.has(id));

    await appendTransaction(buildValues(body, id, new Date().toISOString()));
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("POST /api/transactions failed", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = clean(body.id);
    if (!id) return errorResponse("ID transaksi wajib diisi");

    const validation = validateBody(body);
    if (validation) return errorResponse(validation);

    const rows = await readTransactions();
    const found = findRow(rows, id);
    if (!found) return errorResponse("Transaksi tidak ditemukan", 404);

    const balances = getBalances(rows, id);
    const jenis = clean(body.jenis);
    const sumber = clean(body.sumberDana);
    const nominal = numberValue(body.nominal);

    if ((jenis === "PENGELUARAN" || jenis === "TRANSFER") && (balances[sumber] || 0) < nominal) {
      return errorResponse(
        `Saldo ${sumber} tidak cukup. Saldo tersedia ${(balances[sumber] || 0).toLocaleString("id-ID")}, transaksi ${nominal.toLocaleString("id-ID")}.`
      );
    }

    const existing = rowToObject(rows[found.rowIndex]);
    await updateTransaction(
      found.rowNumber,
      buildValues(body, id, existing.createdAt || new Date().toISOString())
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("PUT /api/transactions failed", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = clean(body.id);
    if (!id) return errorResponse("ID transaksi wajib diisi");

    const rows = await readTransactions();
    const found = findRow(rows, id);
    if (!found) return errorResponse("Transaksi tidak ditemukan", 404);

    await deleteTransaction(found.rowNumber);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/transactions failed", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
