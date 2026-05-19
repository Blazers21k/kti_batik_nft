import { ethers } from "ethers";
import { NextResponse } from "next/server";

/**
 * POST /api/nfc-rewrite
 * Re-generate signed verify URL untuk token yang sudah dimint.
 * Berguna ketika NFC tag belum sempat ditulis saat minting.
 * 
 * Body: { tokenId: string } atau { nfcUid: string }
 * Returns: { verifyUrl, qrSignature, tokenId, nfcUid }
 */
export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'local';
    console.log(`📝 [${new Date().toISOString()}] ${ip} → POST /api/nfc-rewrite`);

    // 1. Validasi konfigurasi
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const alchemyUrl = process.env.ALCHEMY_RPC_URL;

    if (!privateKey || !contractAddress || !alchemyUrl) {
      return NextResponse.json(
        { error: "Konfigurasi blockchain tidak lengkap." },
        { status: 500 }
      );
    }

    // 2. Ambil input
    const body = await request.json().catch(() => ({}));
    const { tokenId, nfcUid } = body;

    if (!tokenId && !nfcUid) {
      return NextResponse.json(
        { error: "Token ID atau NFC UID harus disertakan." },
        { status: 400 }
      );
    }

    // 3. Setup provider & wallet
    const provider = new ethers.JsonRpcProvider(alchemyUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const ABI = [
      "function ownerOf(uint256 tokenId) view returns (address)",
      "function getUidNfc(uint256 tokenId) view returns (string)",
      "function nfcUid(uint256 tokenId) view returns (string)",
      "function getTokenByNfc(string uidNfc) view returns (uint256)",
      "function isNfcRegistered(string uidNfc) view returns (bool)"
    ];
    const contract = new ethers.Contract(contractAddress, ABI, provider);

    // 4. Resolve tokenId dan nfcUid
    let resolvedTokenId = tokenId;
    let resolvedNfcUid = nfcUid;

    if (nfcUid && !tokenId) {
      // Cari token ID dari NFC UID
      try {
        const tid = await contract.getTokenByNfc(nfcUid);
        if (tid.toString() === "0") {
          return NextResponse.json(
            { error: "NFC UID ini belum terdaftar di blockchain." },
            { status: 404 }
          );
        }
        resolvedTokenId = tid.toString();
      } catch (e) {
        // Fallback: scan sequential jika fungsi tidak ada di kontrak lama
        console.log("⚠️ getTokenByNfc tidak tersedia, scanning sequential...");
        let found = false;
        for (let i = 1; i <= 50; i++) {
          try {
            let uid;
            try { uid = await contract.getUidNfc(i); } catch { 
              try { uid = await contract.nfcUid(i); } catch { continue; }
            }
            if (uid === nfcUid) {
              resolvedTokenId = i.toString();
              found = true;
              break;
            }
          } catch { continue; }
        }
        if (!found) {
          return NextResponse.json(
            { error: "NFC UID tidak ditemukan di blockchain." },
            { status: 404 }
          );
        }
      }
    }

    if (tokenId && !nfcUid) {
      // Ambil NFC UID dari token ID
      try {
        resolvedNfcUid = await contract.getUidNfc(resolvedTokenId);
      } catch {
        try {
          resolvedNfcUid = await contract.nfcUid(resolvedTokenId);
        } catch {
          return NextResponse.json(
            { error: "Tidak bisa membaca NFC UID dari token ini." },
            { status: 404 }
          );
        }
      }
    }

    // 5. Verifikasi token exists
    try {
      await contract.ownerOf(resolvedTokenId);
    } catch {
      return NextResponse.json(
        { error: "Token tidak ditemukan di blockchain." },
        { status: 404 }
      );
    }

    // 6. Re-generate ECDSA Signature (sama persis seperti saat minting)
    const message = `batikchain:${resolvedTokenId}:${resolvedNfcUid}`;
    const qrSignature = await wallet.signMessage(message);

    console.log(`🔐 Re-signed Token #${resolvedTokenId}, NFC: ${resolvedNfcUid}`);

    const verifyUrl = `/verify?id=${resolvedTokenId}&sig=${encodeURIComponent(qrSignature)}`;

    return NextResponse.json({
      success: true,
      tokenId: resolvedTokenId,
      nfcUid: resolvedNfcUid,
      qrSignature: qrSignature,
      verifyUrl: verifyUrl,
      adminAddress: wallet.address
    });

  } catch (error) {
    console.error("💥 NFC Rewrite Error:", error);
    return NextResponse.json(
      { error: "Gagal re-generate: " + (error.message || "Error tidak diketahui") },
      { status: 500 }
    );
  }
}
