import { NextResponse } from "next/server";
import { readAuthState } from "../../../../../lib/auth-state";
import { getRequestUser, isAdminUser } from "../../../../../lib/access-control";
import { assignCertificate } from "../../../../../lib/certificate-store";
import { readCertificateFromChain } from "../../../../../lib/certificate-chain";
import { safeErrorResponse, sanitizeInput } from "../../../../../lib/security";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });

    const { tokenId } = await params;
    if (!/^\d{1,20}$/.test(String(tokenId || ""))) {
      return NextResponse.json({ error: "Token ID tidak valid." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const artisanUserId = sanitizeInput(body.artisanUserId, 100);
    if (!artisanUserId) return NextResponse.json({ error: "Akun pengrajin wajib dipilih." }, { status: 400 });

    const state = await readAuthState();
    const artisan = state.users.find((entry) => entry.id === artisanUserId);
    if (!artisan || isAdminUser(artisan)) {
      return NextResponse.json({ error: "Akun pengrajin tidak ditemukan." }, { status: 404 });
    }

    try {
      await readCertificateFromChain(tokenId);
    } catch {
      return NextResponse.json({ error: "Sertifikat tidak ditemukan di blockchain." }, { status: 404 });
    }

    const record = await assignCertificate(tokenId, artisanUserId, user.id);
    if (!record) {
      return NextResponse.json({ error: "Sertifikat ini sudah pernah ditautkan ke akun pengrajin." }, { status: 409 });
    }
    return NextResponse.json({ success: true, record: { tokenId: record.token_id, artisanUserId: record.artisan_user_id } });
  } catch (error) {
    return safeErrorResponse(error, "Gagal menghubungkan sertifikat ke akun pengrajin.");
  }
}
