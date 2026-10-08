import { NextResponse } from "next/server";
import { getRequestUser, isAdminUser } from "../../../lib/access-control";
import { listCertificateRecords } from "../../../lib/certificate-store";
import { safeErrorResponse } from "../../../lib/security";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });

    const records = await listCertificateRecords();
    return NextResponse.json({
      success: true,
      records: records.map((record) => ({
        tokenId: record.token_id,
        artisanUserId: record.artisan_user_id,
        supplementalMaterials: record.supplemental_materials || [],
      })),
    });
  } catch (error) {
    return safeErrorResponse(error, "Gagal mengambil tautan sertifikat.");
  }
}
