import { ethers } from "ethers";
import { NextResponse } from "next/server";
import { enforceRateLimit, sanitizeInput, safeErrorResponse } from "../../lib/security";
import { getClientIP } from "../../lib/rate-limit";

/**
 * GET /api/check-nfc?uid=04:db:2c:55:bb:2a:81
 * Cek apakah NFC UID sudah terdaftar di blockchain
 */
export async function GET(request) {
  try {
    // Rate Limit: 20 check per menit per IP
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 20 });
    if (rateLimitError) return rateLimitError;

    const ip = getClientIP(request);
    console.log(`📝 [${new Date().toISOString()}] ${ip} → GET /api/check-nfc`);

    const { searchParams } = new URL(request.url);
    const uid = sanitizeInput(searchParams.get("uid"), 100);

    if (!uid) {
      return NextResponse.json({ error: "NFC UID wajib disertakan." }, { status: 400 });
    }

    const rpcUrl = process.env.ALCHEMY_RPC_URL;
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

    if (!rpcUrl || !contractAddress) {
      return NextResponse.json({ error: "Konfigurasi blockchain tidak lengkap." }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Coba panggil isNfcRegistered jika ada, fallback ke scan manual
    const ABI = [
      "function isNfcRegistered(string uidNfc) view returns (bool)",
      "function getTokenByNfc(string uidNfc) view returns (uint256)",
      "function totalSupply() view returns (uint256)",
      "function getUidNfc(uint256 tokenId) view returns (string)",
      "function nfcUid(uint256 tokenId) view returns (string)",
      "function tokenURI(uint256 tokenId) view returns (string)"
    ];
    const contract = new ethers.Contract(contractAddress, ABI, provider);

    let isRegistered = false;
    let tokenId = null;
    let tokenName = null;

    // Method 1: Coba fungsi langsung
    try {
      isRegistered = await contract.isNfcRegistered(uid);
      if (isRegistered) {
        const tid = await contract.getTokenByNfc(uid);
        tokenId = tid.toString();

        // Ambil nama dari metadata
        try {
          const uri = await contract.tokenURI(tokenId);
          if (uri.startsWith("data:application/json;base64")) {
            const json = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());
            tokenName = json.name;
          } else if (uri.startsWith("ipfs://")) {
            const res = await fetch(uri.replace("ipfs://", "https://ipfs.io/ipfs/"), {
              signal: AbortSignal.timeout(5000)
            });
            const json = await res.json();
            tokenName = json.name;
          }
        } catch { /* metadata tidak bisa dibaca, tidak masalah */ }
      }
    } catch {
      // Method 2: Scan sequential (untuk kontrak lama tanpa isNfcRegistered)
      console.log("⚠️ isNfcRegistered tidak tersedia, scanning...");
      try {
        const total = Number(await contract.totalSupply());
        for (let i = 1; i <= total; i++) {
          try {
            let nfcUid;
            try { nfcUid = await contract.getUidNfc(i); } catch {
              try { nfcUid = await contract.nfcUid(i); } catch { continue; }
            }
            if (nfcUid === uid) {
              isRegistered = true;
              tokenId = i.toString();

              try {
                const uri = await contract.tokenURI(i);
                if (uri.startsWith("data:application/json;base64")) {
                  const json = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());
                  tokenName = json.name;
                }
              } catch { /* skip */ }
              break;
            }
          } catch { continue; }
        }
      } catch (e) {
        console.error("Scan error:", e.message);
      }
    }

    return NextResponse.json({
      success: true,
      uid: uid,
      isRegistered: isRegistered,
      tokenId: tokenId,
      tokenName: tokenName
    });

  } catch (error) {
    return safeErrorResponse(error, "Gagal cek NFC. Silakan coba lagi.");
  }
}
