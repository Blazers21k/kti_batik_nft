import { NextResponse } from "next/server";
import { enforceRateLimit, sanitizeInput, safeErrorResponse } from "../../../lib/security";
import { getClientIP } from "../../../lib/rate-limit";
import { createPendingVerification, isValidEmail, isValidPassword } from "../../../lib/auth";
import { sendVerificationEmail } from "../../../lib/email";

// ═══════════════════════════════════════
// POST /api/auth/register — Kirim OTP ke Email
// ═══════════════════════════════════════

export async function POST(request) {
  try {
    // Rate Limit: 20 percobaan register per menit per IP
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 20 });
    if (rateLimitError) return rateLimitError;

    const ip = getClientIP(request);
    console.log(`📝 [${new Date().toISOString()}] ${ip} → POST /api/auth/register`);

    const body = await request.json().catch(() => ({}));
    const nama = sanitizeInput(body.nama, 100);
    const email = sanitizeInput(body.email, 200);
    const password = body.password || "";

    // Validasi input
    if (!nama || nama.length < 2) {
      return NextResponse.json(
        { error: "Nama harus minimal 2 karakter" },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Format email tidak valid" },
        { status: 400 }
      );
    }

    const passwordCheck = isValidPassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.reason },
        { status: 400 }
      );
    }

    // Buat pending verification & generate OTP
    const result = await createPendingVerification(nama, email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 409 }
      );
    }

    // Kirim email verifikasi
    const emailResult = await sendVerificationEmail(nama, email, result.otp);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Gagal mengirim email verifikasi. Coba lagi nanti." },
        { status: 500 }
      );
    }

    console.log(`📧 OTP dikirim ke: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Kode verifikasi telah dikirim ke email Anda",
      email: email,
      // Jangan kirim OTP ke client! Hanya untuk fallback dev
      ...(emailResult.fallback ? { _devOtp: result.otp } : {}),
    });

  } catch (error) {
    return safeErrorResponse(error, "Terjadi kesalahan saat registrasi.");
  }
}
