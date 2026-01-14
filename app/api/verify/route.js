import { ethers } from "ethers";
import { NextResponse } from "next/server";

// DECENTRALIZED: Alamat Admin Wallet yang PUBLIK
// Siapapun bisa verify signature dengan address ini tanpa perlu server
const KNOWN_ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "";

// Helper: Verify QR signature menggunakan ECDSA (decentralized)
const verifyQRSignature = (tokenId, nfcUid, providedSignature) => {
  if (!providedSignature) return { valid: false, level: "qr_only", signer: null };

  try {
    // Reconstruct message yang di-sign saat minting
    const message = `batikchain:${tokenId}:${nfcUid}`;

    // Recover address dari signature (DECENTRALIZED - tidak perlu secret key!)
    const recoveredAddress = ethers.verifyMessage(message, providedSignature);

    // Bandingkan dengan admin address yang sudah diketahui publik
    const isValid = recoveredAddress.toLowerCase() === KNOWN_ADMIN_ADDRESS.toLowerCase();

    return {
      valid: isValid,
      level: isValid ? "qr_signed" : "qr_invalid",
      signer: recoveredAddress
    };
  } catch (e) {
    console.error("Signature verification error:", e.message);
    return { valid: false, level: "qr_invalid", signer: null };
  }
};

export async function GET(request) {
  try {
    // 1. Validasi Konfigurasi Blockchain
    const rpcUrl = process.env.ALCHEMY_RPC_URL;
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

    if (!rpcUrl || !contractAddress) {
      console.error("💥 Konfigurasi RPC/Contract tidak lengkap!");
      return NextResponse.json(
        { error: "Konfigurasi Blockchain tidak lengkap di server." },
        { status: 500 }
      );
    }

    // 2. Validasi Input Token ID & Signature
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("id");
    const signature = searchParams.get("sig"); // Optional: QR signature

    if (!tokenId) {
      return NextResponse.json({ error: "Token ID wajib disertakan." }, { status: 400 });
    }

    console.log(`🔍 Memverifikasi Token #${tokenId}${signature ? ' dengan signature' : ''}...`);

    // 3. Setup Provider & Contract
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const ABI = [
      "function ownerOf(uint256 tokenId) view returns (address)",
      "function tokenURI(uint256 tokenId) view returns (string)",
      "function statusQr(uint256 tokenId) view returns (uint8)",
      "function getUidNfc(uint256 tokenId) view returns (string)",
      "function nfcUid(uint256 tokenId) view returns (string)"
    ];
    const contract = new ethers.Contract(contractAddress, ABI, provider);

    // 4. Baca Data Owner & URI
    let owner, uri;
    try {
      [owner, uri] = await Promise.all([
        contract.ownerOf(tokenId),
        contract.tokenURI(tokenId)
      ]);
    } catch (e) {
      console.warn(`⚠️ Token #${tokenId} tidak ditemukan:`, e.message);
      return NextResponse.json({ error: "Token belum dicetak atau tidak ditemukan." }, { status: 404 });
    }

    // 5. Baca NFC UID (Coba 2 Nama Fungsi)
    let nfc = "-";
    try {
      nfc = await contract.getUidNfc(tokenId);
    } catch {
      try {
        nfc = await contract.nfcUid(tokenId);
      } catch {
        console.log("ℹ️ Fungsi NFC tidak tersedia di kontrak ini.");
      }
    }

    // 6. Baca Status QR
    let statusText = "Tidak Diketahui";
    try {
      const statusQrCode = await contract.statusQr(tokenId);
      statusText = statusQrCode.toString() === "1" ? "✅ AKTIF" : "⚠️ TERCETAK";
    } catch {
      statusText = "TERDAFTAR";
    }

    // 7. Decode Metadata (dengan Timeout untuk IPFS)
    let metadata = { name: "Unknown", description: "-", attributes: [] };
    try {
      if (uri.startsWith("data:application/json;base64")) {
        const base64Data = uri.split(",")[1];
        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        metadata = JSON.parse(jsonString);
      } else if (uri.startsWith("http") || uri.startsWith("ipfs")) {
        const cleanUrl = uri.replace("ipfs://", "https://ipfs.io/ipfs/");

        // Fetch dengan Timeout 10 detik
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const res = await fetch(cleanUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          metadata = await res.json();
        } catch (fetchError) {
          console.warn("⚠️ IPFS timeout atau gagal fetch, menggunakan metadata default.");
        }
      }
    } catch (e) {
      console.log("ℹ️ Gagal parse metadata, menggunakan default.");
    }

    // 8. Verify QR Signature menggunakan ECDSA (DECENTRALIZED)
    const signatureResult = verifyQRSignature(tokenId, nfc, signature ? decodeURIComponent(signature) : null);

    // Tentukan verification level
    let verificationLevel = "qr_only"; // Default: QR tanpa signature
    let verificationLabel = "📱 Verifikasi via QR/Link";
    let signerAddress = null;

    if (signature) {
      if (signatureResult.valid) {
        verificationLevel = "qr_signed";
        verificationLabel = "🔐 QR Tersignature (Valid) - Decentralized";
        signerAddress = signatureResult.signer;
        console.log(`✅ ECDSA Signature valid! Signer: ${signerAddress}`);
      } else {
        verificationLevel = "qr_invalid";
        verificationLabel = "⚠️ Signature Tidak Valid";
        signerAddress = signatureResult.signer;
        console.warn(`⚠️ Signature TIDAK valid! Recovered: ${signerAddress}, Expected: ${KNOWN_ADMIN_ADDRESS}`);
      }
    }

    console.log(`✅ Verifikasi Token #${tokenId} berhasil. Level: ${verificationLevel}`);

    return NextResponse.json({
      success: true,
      data: {
        id: tokenId,
        owner: owner,
        nfcUid: nfc,
        status: statusText,
        metadata: metadata,
        // Verification level info
        verificationLevel: verificationLevel,
        verificationLabel: verificationLabel,
        signatureValid: signatureResult.valid,
        hasSignature: !!signature
      }
    });

  } catch (error) {
    console.error("💥 Verify API Error:", error);

    let message = "Terjadi kesalahan saat verifikasi.";
    if (error.code === "NETWORK_ERROR") {
      message = "Gagal terhubung ke jaringan blockchain.";
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
