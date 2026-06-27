import { NextResponse } from "next/server";
import { enforceRateLimit, sanitizeInput, safeErrorResponse } from "../../../lib/security";
import { getClientIP } from "../../../lib/rate-limit";
import { resetPassword } from "../../../lib/auth";

// ═══════════════════════════════════════
// POST /api/auth/reset-password — Verifikasi OTP & Reset Password
// ═══════════════════════════════════════

export async function POST(request) {
  try {
    // Rate Limit: 5 percobaan reset password per menit per IP
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 5 });
    if (rateLimitError) return rateLimitError;

    const ip = getClientIP(request);
    console.log(`📝 [${new Date().toISOString()}] ${ip} → POST /api/auth/reset-password`);

    const body = await request.json().catch(() => ({}));
    const email = sanitizeInput(body.email, 200);
    const otpCode = sanitizeInput(body.otpCode, 6);
    const password = body.password || "";

    if (!email || !otpCode || !password) {
      return NextResponse.json(
        { error: "Email, kode verifikasi, dan password baru harus diisi" },
        { status: 400 }
      );
    }

    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      return NextResponse.json(
        { error: "Kode verifikasi harus 6 digit angka" },
        { status: 400 }
      );
    }

    // Proses reset password
    const result = await resetPassword(email, otpCode, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    console.log(`✅ Password berhasil direset untuk: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Password berhasil di-reset! Silakan login kembali.",
    });

  } catch (error) {
    return safeErrorResponse(error, "Terjadi kesalahan saat memproses reset password.");
  }
}
