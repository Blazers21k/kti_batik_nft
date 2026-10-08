import { NextResponse } from "next/server";
import { getRequestUser, isAdminUser } from "../../../lib/access-control";
import { getCertificateRecord, saveSupplementalCertificateData } from "../../../lib/certificate-store";
import { getMetadataMaterials, getMetadataTechnique, readCertificateFromChain } from "../../../lib/certificate-chain";
import { enforceRateLimit, safeErrorResponse, sanitizeInput } from "../../../lib/security";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 30 });
    if (rateLimitError) return rateLimitError;

    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });

    const { tokenId } = await params;
    if (!/^\d{1,20}$/.test(String(tokenId || ""))) {
      return NextResponse.json({ error: "Token ID tidak valid." }, { status: 400 });
    }

    const record = await getCertificateRecord(tokenId);
    const isAdmin = isAdminUser(user);
    if (!record && !isAdmin) {
      return NextResponse.json({ error: "Sertifikat belum ditautkan ke akun Anda." }, { status: 404 });
    }
    if (record && !isAdmin && record.artisan_user_id !== user.id) {
      return NextResponse.json({ error: "Anda hanya dapat membaca sertifikat yang ditautkan ke akun Anda." }, { status: 403 });
    }

    const certificate = await readCertificateFromChain(tokenId);
    const chainMaterials = getMetadataMaterials(certificate.metadata);
    const supplementalMaterials = record?.supplemental_materials || [];
    const materials = chainMaterials.length ? chainMaterials : supplementalMaterials;
    const chainTechnique = getMetadataTechnique(certificate.metadata);
    const technique = chainTechnique || record?.supplemental_technique || null;
    return NextResponse.json({
      success: true,
      data: {
        id: certificate.id,
        owner: certificate.owner,
        status: certificate.status,
        nfcUid: certificate.nfcUid,
        issuedAt: getMetadataIssueDate(certificate.metadata),
        materials,
        materialsSource: chainMaterials.length ? "blockchain" : materials.length ? "application" : null,
        technique,
        techniqueSource: chainTechnique ? "blockchain" : technique ? "application" : null,
        metadata: certificate.metadata,
        artisanUserId: record?.artisan_user_id || null,
      },
    });
  } catch (error) {
    return safeErrorResponse(error, "Gagal membaca data sertifikat.");
  }
}

export async function PUT(request, { params }) {
  try {
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 20 });
    if (rateLimitError) return rateLimitError;

    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });

    const { tokenId } = await params;
    if (!/^\d{1,20}$/.test(String(tokenId || ""))) {
      return NextResponse.json({ error: "Token ID tidak valid." }, { status: 400 });
    }

    const record = await getCertificateRecord(tokenId);
    if (!record) return NextResponse.json({ error: "Sertifikat belum ditautkan ke akun pengrajin." }, { status: 404 });
    if (!isAdminUser(user) && record.artisan_user_id !== user.id) {
      return NextResponse.json({ error: "Anda hanya dapat mengelola sertifikat yang ditautkan ke akun Anda." }, { status: 403 });
    }

    const parsedBody = await request.json().catch(() => ({}));
    const body = parsedBody && typeof parsedBody === "object" ? parsedBody : {};
    const hasMaterials = Object.prototype.hasOwnProperty.call(body, "materials");
    const hasTechnique = Object.prototype.hasOwnProperty.call(body, "technique");
    if (!hasMaterials && !hasTechnique) {
      return NextResponse.json({ error: "Isi bahan atau jenis batik yang ingin dilengkapi." }, { status: 400 });
    }

    const chainCertificate = await readCertificateFromChain(tokenId);
    if (hasMaterials && getMetadataMaterials(chainCertificate.metadata).length > 0) {
      return NextResponse.json({ error: "Bahan sertifikat ini sudah tercatat pada metadata blockchain." }, { status: 409 });
    }
    if (hasTechnique && getMetadataTechnique(chainCertificate.metadata)) {
      return NextResponse.json({ error: "Jenis batik sertifikat ini sudah tercatat pada metadata blockchain." }, { status: 409 });
    }

    const materials = hasMaterials
      ? (Array.isArray(body.materials)
          ? [...new Set(body.materials.map((value) => sanitizeInput(value, 120)).filter(Boolean))].slice(0, 30)
          : [])
      : undefined;
    if (hasMaterials && materials.length === 0) {
      return NextResponse.json({ error: "Pilih atau ketik minimal satu bahan." }, { status: 400 });
    }
    const technique = hasTechnique ? sanitizeInput(body.technique, 80) : undefined;
    if (hasTechnique && !technique) {
      return NextResponse.json({ error: "Isi jenis batik yang ingin dilengkapi." }, { status: 400 });
    }

    const saved = await saveSupplementalCertificateData(tokenId, { materials, technique }, user.id);
    if (!saved) return NextResponse.json({ error: "Data sertifikat tidak ditemukan." }, { status: 404 });

    return NextResponse.json({
      success: true,
      materials: saved.supplemental_materials,
      technique: saved.supplemental_technique,
      updatedAt: saved.updated_at,
      dataLocation: "app",
    });
  } catch (error) {
    return safeErrorResponse(error, "Gagal menyimpan bahan tambahan sertifikat.");
  }
}
