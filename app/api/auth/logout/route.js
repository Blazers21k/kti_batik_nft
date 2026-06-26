import { NextResponse } from "next/server";
import { enforceRateLimit, safeErrorResponse } from "../../../lib/security";
import { getClientIP } from "../../../lib/rate-limit";
import { destroySession } from "../../../lib/auth";

// ═══════════════════════════════════════
// POST /api/auth/logout — Hapus Session
// ═══════════════════════════════════════

export async function POST(request) {
  try {
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 10 });
    if (rateLimitError) return rateLimitError;

    const ip = getClientIP(request);
    console.log(`📝 [${new Date().toISOString()}] ${ip} → POST /api/auth/logout`);

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (token) {
      destroySession(token);
    }

    return NextResponse.json({
      success: true,
      message: "Berhasil logout",
    });

  } catch (error) {
    return safeErrorResponse(error, "Terjadi kesalahan saat logout.");
  }
}
