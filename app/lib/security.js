/**
 * SECURITY UTILITIES
 * Fungsi keamanan bersama untuk semua API routes.
 */

import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP } from "./rate-limit";

// ═══════════════════════════════════════
// 1. RATE LIMIT MIDDLEWARE
// ═══════════════════════════════════════

/**
 * Cek rate limit dan return error response jika melebihi batas.
 * @returns {NextResponse|null} - Error response atau null jika masih diizinkan
 */
export function enforceRateLimit(request, options = {}) {
  const ip = getClientIP(request);
  const result = checkRateLimit(ip, options);

  if (!result.allowed) {
    console.warn(`🚫 Rate limit exceeded: ${ip}`);
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null; // Allowed
}

// ═══════════════════════════════════════
// 2. INPUT SANITIZATION
// ═══════════════════════════════════════

/**
 * Sanitasi string input — hapus karakter kontrol dan trim.
 * Untuk mencegah prompt injection dan data corruption.
 */
export function sanitizeInput(str, maxLength = 1000) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Hapus control chars (kecuali newline, tab)
    .trim()
    .substring(0, maxLength);
}

/**
 * Sanitasi teks untuk HTML — mencegah XSS saat di-render
 */
export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ═══════════════════════════════════════
// 3. PAYLOAD SIZE VALIDATION
// ═══════════════════════════════════════

/**
 * Validasi ukuran payload request
 * @param {Request} request
 * @param {number} maxSizeBytes - Ukuran maksimal dalam bytes (default: 5MB)
 * @returns {NextResponse|null} - Error response atau null jika valid
 */
export async function validatePayloadSize(request, maxSizeBytes = 5 * 1024 * 1024) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > maxSizeBytes) {
    return NextResponse.json(
      { error: `Payload terlalu besar. Maksimal ${Math.round(maxSizeBytes / 1024 / 1024)}MB.` },
      { status: 413 }
    );
  }
  return null;
}

// ═══════════════════════════════════════
// 4. SAFE ERROR RESPONSE
// ═══════════════════════════════════════

/**
 * Buat error response yang aman — tidak membocorkan detail internal.
 * Detail error tetap di-log ke server console.
 */
export function safeErrorResponse(error, userMessage = "Terjadi kesalahan internal.", statusCode = 500) {
  // Log detail error ke server (tidak terkirim ke client)
  console.error("🔴 Server Error:", error?.message || error);

  // Kirim pesan generik ke client
  return NextResponse.json(
    { error: userMessage },
    { status: statusCode }
  );
}

// ═══════════════════════════════════════
// 5. ADMIN AUTH CHECK
// ═══════════════════════════════════════

/**
 * Verifikasi admin API secret.
 * Gunakan untuk endpoint admin-only (generate kode akses, dll).
 */
export function verifyAdminSecret(request) {
  const { searchParams } = new URL(request.url);
  const providedKey = searchParams.get("key");
  const adminSecret = process.env.ADMIN_API_SECRET;

  if (!adminSecret) {
    console.error("⚠️ ADMIN_API_SECRET belum dikonfigurasi di .env.local");
    return false;
  }

  return providedKey === adminSecret;
}

// ═══════════════════════════════════════
// 6. MIME TYPE VALIDATION
// ═══════════════════════════════════════

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Validasi dan parse base64 image data.
 * @returns {{ valid: boolean, mimeType: string, base64Data: string, error?: string }}
 */
export function validateImageBase64(imageBase64) {
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return { valid: false, error: "Data gambar tidak valid." };
  }

  // Parse MIME type dari data URI
  const mimeMatch = imageBase64.match(/^data:(image\/[\w+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : null;

  if (!mimeType || !ALLOWED_IMAGE_MIMES.includes(mimeType)) {
    return {
      valid: false,
      error: `Format gambar tidak didukung. Gunakan: ${ALLOWED_IMAGE_MIMES.join(", ")}`,
    };
  }

  const base64Data = imageBase64.split(",")[1];
  if (!base64Data || base64Data.length < 100) {
    return { valid: false, error: "Data gambar terlalu kecil atau rusak." };
  }

  // Cek ukuran (base64 ≈ 1.37x ukuran asli)
  const estimatedSizeBytes = (base64Data.length * 3) / 4;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  if (estimatedSizeBytes > MAX_IMAGE_SIZE) {
    return { valid: false, error: "Ukuran gambar terlalu besar. Maksimal 10MB." };
  }

  return { valid: true, mimeType, base64Data };
}
