import { NextResponse } from "next/server";
import { getRequestUser } from "../../../lib/access-control";
import { listCertificateRecordsForUser } from "../../../lib/certificate-store";
import { safeErrorResponse } from "../../../lib/security";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });

    const records = await listCertificateRecordsForUser(user.id);
    return NextResponse.json({
      success: true,
      records: records.map((record) => ({
        tokenId: record.token_id,
        supplementalMaterials: record.supplemental_materials || [],
        updatedAt: record.updated_at,
      })),
    });
  } catch (error) {
    return safeErrorResponse(error, "Gagal mengambil daftar sertifikat akun.");
  }
}
