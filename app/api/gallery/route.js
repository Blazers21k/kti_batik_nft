import { ethers } from "ethers";
import { NextResponse } from "next/server";
import METADATA_OVERRIDES from "../../config/metadata-overrides";
import { enforceRateLimit, sanitizeInput, safeErrorResponse } from "../../lib/security";
import { getClientIP } from "../../lib/rate-limit";
import { getCertificateRecords } from "../../lib/certificate-store";
import { getMetadataIssueDate, getMetadataMaterials, getMetadataTechnique } from "../../lib/certificate-chain";

export async function GET(request) {
    try {
        // Rate Limit: 20 request per menit per IP
        const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 20 });
        if (rateLimitError) return rateLimitError;

        // Request Logging
        const ip = getClientIP(request);
        console.log(`📝 [${new Date().toISOString()}] ${ip} → GET /api/gallery`);

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
                } catch {
                    // Jika tokenByIndex tidak tersedia, fallback ke sequential
                    tokens.push(i + 1);
                }
            }
        } catch {
            console.log("ℹ️ totalSupply tidak tersedia, mencoba method alternatif...");

            // Method 2: Scan sequential token IDs (1-50)
            for (let tokenId = 1; tokenId <= 50; tokenId++) {
                try {
                    await contract.ownerOf(tokenId);
                    tokens.push(tokenId);
                } catch {
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
                    } else if (uri.startsWith("ipfs://") || uri.startsWith("https://")) {
                        // BUG-3 FIX: Fetch metadata dari IPFS gateway
                        try {
                            const cleanUrl = uri.replace("ipfs://", "https://ipfs.io/ipfs/");
                            const res = await fetch(cleanUrl, {
                                signal: AbortSignal.timeout(8000) // Timeout 8 detik
                            });
                            metadata = await res.json();
                        } catch (fetchErr) {
                            console.warn(`⚠️ Gagal fetch IPFS metadata token #${tokenId}:`, fetchErr.message);
                        }
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

                    // Apply overrides jika ada
                    const override = METADATA_OVERRIDES[tokenId.toString()];

                    return {
                        tokenId: tokenId.toString(),
                        name: override?.name || metadata.name || `Batik #${tokenId}`,
                        description: override?.description || metadata.description || "-",
                        image: override?.image || metadata.image || "",
                        owner: owner,
                        nfcUid: nfcUid,
                        attributes: metadata.attributes || [],
                        issuedAt: getMetadataIssueDate(metadata),
                        technique: getMetadataTechnique(metadata),
                        materials: getMetadataMaterials(metadata),
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

        // Merge legacy supplements from Neon while keeping blockchain metadata authoritative.
        let recordsByTokenId = new Map();
        try {
            const records = await getCertificateRecords(validNfts.map((nft) => nft.tokenId));
            recordsByTokenId = new Map(records.map((record) => [record.token_id, record]));
        } catch (error) {
            console.warn("Data pelengkap sertifikat belum tersedia:", error.message);
        }

        const enrichedNfts = validNfts.map((nft) => {
            const record = recordsByTokenId.get(nft.tokenId);
            const chainMaterials = nft.materials || [];
            const supplementalMaterials = record?.supplemental_materials || [];
            const materials = chainMaterials.length ? chainMaterials : supplementalMaterials;
            const technique = nft.technique || record?.supplemental_technique || null;
            return {
                ...nft,
                materials,
                materialsSource: chainMaterials.length ? "blockchain" : materials.length ? "application" : null,
                technique,
                techniqueSource: nft.technique ? "blockchain" : technique ? "application" : null,
            };
        });

        // Filter by pengrajin name if provided (dengan sanitasi)
        const { searchParams } = new URL(request.url);
        const pengrajinFilter = sanitizeInput(searchParams.get("pengrajin"), 200);

        let filteredNfts = enrichedNfts;
        if (pengrajinFilter) {
            filteredNfts = enrichedNfts.filter(nft => {
                // Check name field
                if (nft.name?.toLowerCase().includes(pengrajinFilter.toLowerCase())) return true;
                // Check attributes for pengrajin name
                const pengrajinAttr = nft.attributes?.find(a => 
                    a.trait_type === "Pengrajin" || a.trait_type === "Nama Pengrajin"
                );
                if (pengrajinAttr?.value?.toLowerCase().includes(pengrajinFilter.toLowerCase())) return true;
                // Check description
                if (nft.description?.toLowerCase().includes(pengrajinFilter.toLowerCase())) return true;
                return false;
            });
        }

        return NextResponse.json({
            success: true,
            total: filteredNfts.length,
            data: filteredNfts,
            sertifikat: filteredNfts, // alias for dashboard compatibility
        });

    } catch (error) {
        return safeErrorResponse(error, "Gagal mengambil data gallery.");
    }
}
