import { NextResponse } from "next/server";
import axios from "axios";
import { enforceRateLimit, safeErrorResponse, validatePayloadSize, validateImageBase64 } from "../../lib/security";
import { getClientIP } from "../../lib/rate-limit";

export async function POST(request) {
    try {
        // Rate Limit: 10 upload per menit per IP
        const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 10 });
        if (rateLimitError) return rateLimitError;

        // SEDANG-2: Validasi ukuran payload (max 10MB)
        const payloadError = await validatePayloadSize(request, 10 * 1024 * 1024);
        if (payloadError) return payloadError;

        // Request Logging
        const ip = getClientIP(request);
        console.log(`📝 [${new Date().toISOString()}] ${ip} → POST /api/ipfs-upload`);

        const PINATA_API_KEY = process.env.PINATA_API_KEY;
        const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

        if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
            return NextResponse.json({
                error: "IPFS belum dikonfigurasi di server."
            }, { status: 500 });
        }

        const body = await request.json();
        const { imageBase64, fileName } = body;

        // RENDAH-4: Validasi MIME type gambar
        const imageValidation = validateImageBase64(imageBase64);
        if (!imageValidation.valid) {
            return NextResponse.json({ error: imageValidation.error }, { status: 400 });
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(imageValidation.base64Data, "base64");

        // Create form data for Pinata
        const FormData = (await import("form-data")).default;
        const formData = new FormData();

        // Sanitasi filename — hanya izinkan karakter aman
        const safeFileName = (fileName || `batik_${Date.now()}.jpg`)
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .substring(0, 100);
        formData.append("file", buffer, { filename: safeFileName });

        // Upload to Pinata
        const pinataResponse = await axios.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    pinata_api_key: PINATA_API_KEY,
                    pinata_secret_api_key: PINATA_SECRET_KEY,
                },
                maxBodyLength: 10 * 1024 * 1024, // Max 10MB
            }
        );

        const ipfsHash = pinataResponse.data.IpfsHash;
        const ipfsUrl = `ipfs://${ipfsHash}`;
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

        console.log(`✅ IPFS Upload Success: ${ipfsHash}`);

        return NextResponse.json({
            success: true,
            ipfsHash,
            ipfsUrl,
            gatewayUrl,
        });

    } catch (error) {
        return safeErrorResponse(error, "Gagal upload ke IPFS. Silakan coba lagi.");
    }
}
