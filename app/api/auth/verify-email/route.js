import { NextResponse } from "next/server";
import { enforceRateLimit, sanitizeInput, safeErrorResponse } from "../../../lib/security";
import { getClientIP } from "../../../lib/rate-limit";
import { verifyOTPAndCreateUser } from "../../../lib/auth";

// ═══════════════════════════════════════
// POST /api/auth/verify-email — Verifikasi OTP & Buat Akun
// ═══════════════════════════════════════

export async function POST(request) {
  try {
    // Rate Limit: 10 percobaan verifikasi per menit per IP
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 10 });
    if (rateLimitError) return rateLimitError;

    const ip = getClientIP(request);
    console.log(`📝 [${new Date().toISOString()}] ${ip} → POST /api/auth/verify-email`);

    const body = await request.json().catch(() => ({}));
    const email = sanitizeInput(body.email, 200);
    const otpCode = sanitizeInput(body.otpCode, 6);

    if (!email || !otpCode) {
      return NextResponse.json(
        { error: "Email dan kode verifikasi harus diisi" },
        { status: 400 }
      );
    }

    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      return NextResponse.json(
        { error: "Kode verifikasi harus 6 digit angka" },
        { status: 400 }
      );
    }

    // Verifikasi OTP dan buat akun
    const result = await verifyOTPAndCreateUser(email, otpCode);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    console.log(`✅ Akun terverifikasi: ${result.user.email} (${result.user.nama})`);

    return NextResponse.json({
      success: true,
      message: "Akun berhasil dibuat! Selamat datang.",
      user: result.user,
      token: result.token,
    });

  } catch (error) {
    return safeErrorResponse(error, "Terjadi kesalahan saat verifikasi.");
  }
}
