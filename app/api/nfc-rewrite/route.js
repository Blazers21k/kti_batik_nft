import { NextResponse } from "next/server";
import { readCertificateFromChain } from "../../lib/certificate-chain";
import { enforceRateLimit, safeErrorResponse, sanitizeInput } from "../../lib/security";

export const runtime = "nodejs";

/** Returns the NFC launch URL for writing/re-writing an NFC tag. */
export async function POST(request) {
  try {
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 10 });
    if (rateLimitError) return rateLimitError;

    const body = await request.json().catch(() => ({}));
    const tokenId = sanitizeInput(body.tokenId, 20);
    if (!tokenId || !/^\d+$/.test(tokenId)) {
      return NextResponse.json({ error: "Token ID tidak valid." }, { status: 400 });
    }

    const certificate = await readCertificateFromChain(tokenId);
    return NextResponse.json({
      success: true,
      tokenId,
      nfcUid: certificate.nfcUid,
      verifyUrl: `/verify?id=${tokenId}`,
    });
  } catch (error) {
    return safeErrorResponse(error, "Gagal menyiapkan tautan NFC.");
  }
}
