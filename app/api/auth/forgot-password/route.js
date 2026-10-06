import { NextResponse } from "next/server";
import { enforceRateLimit, sanitizeInput, safeErrorResponse } from "../../../lib/security";
import { getClientIP } from "../../../lib/rate-limit";
import { createPasswordReset } from "../../../lib/auth";
import { sendResetPasswordEmail } from "../../../lib/email";

// ═══════════════════════════════════════
// POST /api/auth/forgot-password — Request Reset OTP
// ═══════════════════════════════════════

export async function POST(request) {
  try {
    // Rate Limit: 20 percobaan forgot-password per menit per IP
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 20 });
    if (rateLimitError) return rateLimitError;

    const ip = getClientIP(request);
    console.log(`📝 [${new Date().toISOString()}] ${ip} → POST /api/auth/forgot-password`);

    const body = await request.json().catch(() => ({}));
    const email = sanitizeInput(body.email, 200);

    if (!email) {
      return NextResponse.json(
        { error: "Email harus diisi" },
        { status: 400 }
      );
    }

    // Buat record reset & generate OTP
    const result = await createPasswordReset(email);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    // Kirim email reset password
    const emailResult = await sendResetPasswordEmail(result.nama, email, result.otp);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Gagal mengirim email reset password. Coba lagi nanti." },
        { status: 500 }
      );
    }

    console.log(`🔑 OTP Reset dikirim ke: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Kode reset password telah dikirim ke email Anda",
      email: email,
      // Dev mode fallback
      ...(emailResult.fallback ? { _devOtp: result.otp } : {}),
    });

  } catch (error) {
    return safeErrorResponse(error, "Terjadi kesalahan saat memproses permintaan reset password.");
  }
}
