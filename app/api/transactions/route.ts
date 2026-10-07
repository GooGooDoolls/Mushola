import { NextResponse } from "next/server";
import { readTransactions } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await readTransactions();

    return NextResponse.json({
      success: true,
      sheet: "01_TRANSAKSI_UANG",
      rows
    });
  } catch (error) {
    console.error("GET /api/transactions failed", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
