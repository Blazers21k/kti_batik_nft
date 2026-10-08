import { NextResponse } from "next/server";
import METADATA_OVERRIDES from "../../config/metadata-overrides";
import { getCertificateRecord } from "../../lib/certificate-store";
import {
  findTokenByNfcUid,
  getMetadataIssueDate,
  getMetadataMaterials,
  getMetadataTechnique,
  readCertificateFromChain,
} from "../../lib/certificate-chain";
import { enforceRateLimit, safeErrorResponse, sanitizeInput } from "../../lib/security";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 20 });
    if (rateLimitError) return rateLimitError;

    const body = await request.json().catch(() => ({}));
    const nfcUid = sanitizeInput(body.nfcUid, 100);
    const expectedTokenId = sanitizeInput(body.expectedTokenId, 20);

    if (!nfcUid) return NextResponse.json({ error: "UID harus dibaca langsung dari chip NFC." }, { status: 400 });
    if (expectedTokenId && !/^\d+$/.test(expectedTokenId)) {
      return NextResponse.json({ error: "Token ID pada tautan tidak valid." }, { status: 400 });
    }

    const tokenId = await findTokenByNfcUid(nfcUid);
    if (!tokenId) return NextResponse.json({ error: "Chip NFC ini belum terdaftar sebagai sertifikat." }, { status: 404 });
    if (expectedTokenId && expectedTokenId !== tokenId) {
      return NextResponse.json({ error: "Chip NFC tidak cocok dengan tautan sertifikat ini." }, { status: 403 });
    }

    const certificate = await readCertificateFromChain(tokenId);
    if (certificate.nfcUid !== nfcUid) {
      return NextResponse.json({ error: "UID chip tidak cocok dengan data blockchain." }, { status: 403 });
    }

    const metadata = { ...certificate.metadata };
    const override = METADATA_OVERRIDES[tokenId];
    if (override) {
      if (override.image) metadata.image = override.image;
      if (override.name) metadata.name = override.name;
      if (override.description) metadata.description = override.description;
    }

    let materials = getMetadataMaterials(metadata);
    let materialsSource = materials.length ? "blockchain" : null;
    let supplementalTechnique = null;
    try {
      const record = await getCertificateRecord(tokenId);
      if (!materials.length) {
        materials = record?.supplemental_materials || [];
        if (materials.length) materialsSource = "application";
      }
      supplementalTechnique = record?.supplemental_technique || null;
    } catch (error) {
      console.warn("Data pelengkap sertifikat tidak tersedia:", error.message);
    }

    const issuedAt = getMetadataIssueDate(metadata);
    const chainTechnique = getMetadataTechnique(metadata);
    const technique = chainTechnique || supplementalTechnique;
    metadata.materials = materials;
    metadata.issuedAt = issuedAt;
    metadata.technique = technique;

    return NextResponse.json({
      success: true,
      data: {
        id: certificate.id,
        owner: certificate.owner,
        nfcUid: certificate.nfcUid,
        status: certificate.status,
        statusExplanation: "UID dari chip fisik cocok dengan UID yang tersimpan pada blockchain.",
        verificationLevel: "nfc",
        verificationLabel: "Chip NFC terdaftar dan cocok",
        metadata,
        materials,
        materialsSource,
        technique,
        techniqueSource: chainTechnique ? "blockchain" : technique ? "application" : null,
        issuedAt,
      },
    });
  } catch (error) {
    return safeErrorResponse(error, "Terjadi kesalahan saat verifikasi NFC.");
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Verifikasi sertifikat memerlukan pembacaan chip NFC fisik." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
