import { ethers } from "ethers";
import { NextResponse } from "next/server";
import { enforceRateLimit, sanitizeInput, safeErrorResponse, validatePayloadSize } from "../../lib/security";
import { getClientIP } from "../../lib/rate-limit";

export async function POST(request) {
    try {
        // Rate Limit: 10 estimasi per menit per IP
        const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 10 });
        if (rateLimitError) return rateLimitError;

        // Validasi ukuran payload
        const payloadError = await validatePayloadSize(request, 10 * 1024 * 1024);
        if (payloadError) return payloadError;

        // Request Logging
        const ip = getClientIP(request);
        console.log(`📝 [${new Date().toISOString()}] ${ip} → POST /api/estimate-gas`);

        const privateKey = process.env.ADMIN_PRIVATE_KEY;
        const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
        const alchemyUrl = process.env.ALCHEMY_RPC_URL;

        if (!privateKey || !contractAddress || !alchemyUrl) {
            return NextResponse.json({ error: "Konfigurasi tidak lengkap" }, { status: 500 });
        }

        const body = await request.json().catch(() => ({}));
        const namaPengrajin = sanitizeInput(body.namaPengrajin, 200);
        const uidNFC = sanitizeInput(body.uidNFC, 100);
        const finalDescription = sanitizeInput(body.finalDescription, 10000);
        const ipfsUrl = sanitizeInput(body.ipfsUrl, 500);
        const imageBase64 = body.imageBase64;

        if (!uidNFC || !finalDescription || (!imageBase64 && !ipfsUrl)) {
            return NextResponse.json({ error: "Data tidak lengkap untuk estimasi" }, { status: 400 });
        }

        const provider = new ethers.JsonRpcProvider(alchemyUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const recipient = wallet.address;

        // Gunakan IPFS URL jika ada (lebih murah!), fallback ke base64
        const imageData = ipfsUrl || imageBase64;

        // Buat metadata sama seperti di mint
        const metadata = {
            name: `Batik Karya ${namaPengrajin || 'Pengrajin'}`,
            description: finalDescription,
            image: imageData,
            attributes: [
                { trait_type: "NFC UID", value: uidNFC },
                { trait_type: "Date", value: new Date().toISOString() }
            ]
        };

        // Jika pakai IPFS, simulasi tokenURI pendek untuk estimasi akurat
        const PINATA_API_KEY = process.env.PINATA_API_KEY;
        const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

        let tokenURI;
        if (PINATA_API_KEY && PINATA_SECRET_KEY && ipfsUrl) {
            // Simulasi IPFS metadata URL (tidak perlu upload untuk estimasi)
            tokenURI = "ipfs://QmSimulatedHashForGasEstimation12345678901234";
        } else {
            tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
        }

        // Estimasi gas
        const ABI = ["function cetakSertifikat(address,string,string) public returns (uint256)"];
        const contract = new ethers.Contract(contractAddress, ABI, wallet);

        const estimatedGas = await contract.cetakSertifikat.estimateGas(recipient, tokenURI, uidNFC);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("50", "gwei");

        // Hitung biaya dalam POL
        const gasCostWei = estimatedGas * gasPrice;
        const gasCostPOL = ethers.formatEther(gasCostWei);

        // Tambahkan buffer 30%
        const gasCostWithBuffer = parseFloat(gasCostPOL) * 1.3;

        // Hitung ukuran data yang sebenarnya akan disimpan on-chain
        const dataSizeKB = ipfsUrl
            ? Math.round(ipfsUrl.length / 1024 * 100) / 100  // IPFS URL sangat kecil (<1KB)
            : Math.round((imageBase64?.length || 0) / 1024);

        return NextResponse.json({
            success: true,
            estimatedGas: estimatedGas.toString(),
            gasPrice: ethers.formatUnits(gasPrice, "gwei") + " Gwei",
            estimatedCostPOL: gasCostWithBuffer.toFixed(4),
            estimatedCostIDR: Math.round(gasCostWithBuffer * 7000),
            imageSizeKB: dataSizeKB,
            usingIPFS: !!ipfsUrl // Indikator apakah pakai IPFS
        });

    } catch (error) {
        return safeErrorResponse(error, "Gagal estimasi gas. Pastikan data lengkap dan benar.");
    }
}
