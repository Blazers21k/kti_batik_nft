import { ethers } from "ethers";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        // 1. Validasi Konfigurasi
        const rpcUrl = process.env.ALCHEMY_RPC_URL;
        const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

        if (!rpcUrl || !contractAddress) {
            return NextResponse.json(
                { error: "Konfigurasi Blockchain tidak lengkap." },
                { status: 500 }
            );
        }

        // 2. Setup Provider & Contract
        const provider = new ethers.JsonRpcProvider(rpcUrl);

        // ABI untuk membaca data NFT
        const ABI = [
            "function totalSupply() view returns (uint256)",
            "function tokenByIndex(uint256 index) view returns (uint256)",
            "function ownerOf(uint256 tokenId) view returns (address)",
            "function tokenURI(uint256 tokenId) view returns (string)",
            "function getUidNfc(uint256 tokenId) view returns (string)",
            "function nfcUid(uint256 tokenId) view returns (string)",
            // Event untuk alternative method
            "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
        ];

        const contract = new ethers.Contract(contractAddress, ABI, provider);

        // 3. Coba ambil total supply (ERC721Enumerable)
        let tokens = [];

        try {
            // Method 1: Gunakan totalSupply jika kontrak support ERC721Enumerable
            const totalSupply = await contract.totalSupply();
            const total = Number(totalSupply);

            console.log(`📊 Total Supply: ${total} NFTs`);

            // Ambil semua token (max 50 untuk performance)
            const limit = Math.min(total, 50);

            for (let i = 0; i < limit; i++) {
                try {
                    const tokenId = await contract.tokenByIndex(i);
                    tokens.push(Number(tokenId));
                } catch (e) {
                    // Jika tokenByIndex tidak tersedia, fallback ke sequential
                    tokens.push(i + 1);
                }
            }
        } catch (e) {
            console.log("ℹ️ totalSupply tidak tersedia, mencoba method alternatif...");

            // Method 2: Scan sequential token IDs (1-50)
            // Ini akan bekerja untuk kontrak non-enumerable
            for (let tokenId = 1; tokenId <= 50; tokenId++) {
                try {
                    await contract.ownerOf(tokenId);
                    tokens.push(tokenId);
                } catch {
                    // Token tidak exist, lanjut
                    continue;
                }
            }
        }

        console.log(`🎨 Ditemukan ${tokens.length} token: [${tokens.join(", ")}]`);

        // 4. Ambil detail untuk setiap token
        const nfts = await Promise.all(
            tokens.map(async (tokenId) => {
                try {
                    const [owner, uri] = await Promise.all([
                        contract.ownerOf(tokenId),
                        contract.tokenURI(tokenId)
                    ]);

                    // Decode metadata
                    let metadata = { name: `Batik #${tokenId}`, description: "-", image: "" };

                    if (uri.startsWith("data:application/json;base64")) {
                        const base64Data = uri.split(",")[1];
                        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
                        metadata = JSON.parse(jsonString);
                    }

                    // Ambil NFC UID
                    let nfcUid = "-";
                    try {
                        nfcUid = await contract.getUidNfc(tokenId);
                    } catch {
                        try {
                            nfcUid = await contract.nfcUid(tokenId);
                        } catch {
                            // Cari dari attributes
                            const nfcAttr = metadata.attributes?.find(a => a.trait_type === "NFC UID");
                            if (nfcAttr) nfcUid = nfcAttr.value;
                        }
                    }

                    return {
                        tokenId: tokenId.toString(),
                        name: metadata.name || `Batik #${tokenId}`,
                        description: metadata.description || "-",
                        image: metadata.image || "",
                        owner: owner,
                        nfcUid: nfcUid,
                        attributes: metadata.attributes || [],
                        verifyUrl: `/verify?id=${tokenId}`
                    };
                } catch (e) {
                    console.warn(`⚠️ Gagal ambil data token #${tokenId}:`, e.message);
                    return null;
                }
            })
        );

        // Filter null values
        const validNfts = nfts.filter(n => n !== null);

        return NextResponse.json({
            success: true,
            total: validNfts.length,
            data: validNfts
        });

    } catch (error) {
        console.error("💥 Gallery API Error:", error);
        return NextResponse.json(
            { error: "Gagal mengambil data gallery: " + error.message },
            { status: 500 }
        );
    }
}
