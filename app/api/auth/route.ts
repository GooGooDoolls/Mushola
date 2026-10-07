import { NextResponse } from "next/server";
import { COOKIE_NAME, SESSION_TTL_MS, createSessionToken, isValidSessionToken, verifyAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(COOKIE_NAME + "="))?.slice(COOKIE_NAME.length + 1);
  const authenticated = (() => { try { return isValidSessionToken(token); } catch { return false; } })();
  const response = NextResponse.json({ success: true, authenticated });
  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { password?: unknown };
    const password = String(body.password ?? "");
    if (!password) return NextResponse.json({ success: false, error: "Password wajib diisi" }, { status: 400 });
    if (!verifyAdminPassword(password)) return NextResponse.json({ success: false, error: "Password salah" }, { status: 401 });

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000
    });
    return response;
  } catch (error) {
    console.error("POST /api/auth failed", error);
    return NextResponse.json({ success: false, error: "Authentication belum dikonfigurasi" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
