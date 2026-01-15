import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
    try {
        const PINATA_API_KEY = process.env.PINATA_API_KEY;
        const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

        if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
            return NextResponse.json({
                error: "Pinata API keys tidak dikonfigurasi. Tambahkan PINATA_API_KEY dan PINATA_SECRET_KEY ke .env.local"
            }, { status: 500 });
        }

        const body = await request.json();
        const { imageBase64, fileName } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: "imageBase64 wajib diisi" }, { status: 400 });
        }

        // Convert base64 to buffer
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Create form data for Pinata
        const FormData = (await import("form-data")).default;
        const formData = new FormData();

        const filename = fileName || `batik_${Date.now()}.jpg`;
        formData.append("file", buffer, { filename });

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
                maxBodyLength: Infinity,
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
        console.error("IPFS Upload Error:", error);
        return NextResponse.json({
            error: "Gagal upload ke IPFS: " + (error.message || "Error tidak diketahui")
        }, { status: 500 });
    }
}
