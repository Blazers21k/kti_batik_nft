import { NextResponse } from "next/server";
import { enforceRateLimit, safeErrorResponse } from "../../../lib/security";
import { getClientIP } from "../../../lib/rate-limit";
import { getSessionUser, refreshSession } from "../../../lib/auth";
import { isAdminUser } from "../../../lib/access-control";

// ═══════════════════════════════════════
// GET /api/auth/me — Cek Session User
// ═══════════════════════════════════════

export async function GET(request) {
  try {
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 30 });
    if (rateLimitError) return rateLimitError;

    const ip = getClientIP(request);
    console.log(`📝 [${new Date().toISOString()}] ${ip} → GET /api/auth/me`);

    // Ambil token dari Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { error: "Token tidak ditemukan" },
        { status: 401 }
      );
    }

    const user = await getSessionUser(token);

    if (!user) {
      return NextResponse.json(
        { error: "Session tidak valid atau sudah kedaluwarsa" },
        { status: 401 }
      );
    }

    // Perpanjang session (sliding window — 7 hari dari sekarang)
    await refreshSession(token);

    return NextResponse.json({
      success: true,
      user,
      isAdmin: isAdminUser(user),
    });

  } catch (error) {
    return safeErrorResponse(error, "Terjadi kesalahan saat mengecek session.");
  }
}
