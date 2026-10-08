import { ethers } from "ethers";
import { NextResponse } from "next/server";
import { enforceRateLimit, sanitizeInput, safeErrorResponse, validatePayloadSize } from "../../lib/security";
import { getClientIP } from "../../lib/rate-limit";
import { getRequestUser } from "../../lib/access-control";
import { listCertificateRecordsForUser, registerNewCertificate } from "../../lib/certificate-store";
import { isBatikTechnique } from "../../lib/batik-techniques";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    // TINGGI-1: Rate Limit — Minting mahal, batasi 3 per menit per IP
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 3 });
    if (rateLimitError) return rateLimitError;

    // SEDANG-2: Validasi ukuran payload (max 10MB untuk gambar)
    const payloadError = await validatePayloadSize(request, 10 * 1024 * 1024);
    if (payloadError) return payloadError;

    // Request Logging
    const ip = getClientIP(request);
    console.log(`📝 [${new Date().toISOString()}] ${ip} → POST /api/mint`);

    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Silakan login kembali sebelum mencetak sertifikat." }, { status: 401 });
    }

    // Ensure the ownership store is initialized before submitting an irreversible mint.
    await listCertificateRecordsForUser(user.id);

    console.log("🔵 [Backend] Memulai proses Minting Final...");

    // 1. Validasi Konfigurasi Blockchain
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const alchemyUrl = process.env.ALCHEMY_RPC_URL;

    if (!privateKey || !contractAddress || !alchemyUrl) {
      return NextResponse.json(
        { error: "Konfigurasi Blockchain tidak lengkap di server." },
        { status: 500 }
      );
    }

    // 2. Ambil & Validasi Input Data (dengan sanitasi)
    const body = await request.json().catch(() => ({}));
    const namaPengrajin = sanitizeInput(user.nama, 200);
    const uidNFC = sanitizeInput(body.uidNFC, 100);
    const alamatPengrajin = sanitizeInput(body.alamatPengrajin, 42);
    const finalDescription = sanitizeInput(body.finalDescription, 10000);
    const technique = sanitizeInput(body.technique, 80);
    const imageBase64 = body.imageBase64; // Biarkan raw (base64 besar)
    const ipfsUrl = sanitizeInput(body.ipfsUrl, 500);
    const materials = Array.isArray(body.materials)
      ? [...new Set(body.materials.map((value) => sanitizeInput(value, 120)).filter(Boolean))].slice(0, 30)
      : [];

    // Guard Clauses untuk Validasi Input
    if (!uidNFC) return NextResponse.json({ error: "NFC UID wajib diisi." }, { status: 400 });
    if (!finalDescription) return NextResponse.json({ error: "Deskripsi sertifikat tidak boleh kosong." }, { status: 400 });
    if (!namaPengrajin) return NextResponse.json({ error: "Nama pengrajin wajib ada untuk metadata." }, { status: 400 });
    if (!isBatikTechnique(technique)) return NextResponse.json({ error: "Pilih jenis batik yang tersedia." }, { status: 400 });
    if (materials.length === 0) return NextResponse.json({ error: "Pilih atau ketik minimal satu bahan batik." }, { status: 400 });

    // 3. Setup Provider & Wallet (Ethers v6)
    const provider = new ethers.JsonRpcProvider(alchemyUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // 4. TINGGI-5: Validasi alamat Ethereum menggunakan ethers.isAddress
    let recipient = wallet.address; // Default ke admin wallet
    if (alamatPengrajin && ethers.isAddress(alamatPengrajin)) {
      recipient = alamatPengrajin;
    } else if (alamatPengrajin) {
      console.log("ℹ️ Alamat pengrajin tidak valid, NFT akan dikirim ke Admin Wallet.");
    }

    // 5. Konstruksi Metadata & TokenURI
    // Support IPFS URL atau base64
    if (!imageBase64 && !ipfsUrl) {
      return NextResponse.json({ error: "Foto batik wajib diupload." }, { status: 400 });
    }
    // Preferensikan IPFS URL karena lebih murah (gas)
    const imageData = ipfsUrl || imageBase64;

    const issuedAt = new Date().toISOString();
    const metadata = {
      name: `Batik Karya ${namaPengrajin}`,
      description: finalDescription,
      image: imageData,
      technique,
      materials,
      attributes: [
        { trait_type: "NFC UID", value: uidNFC },
        { trait_type: "Jenis Batik", value: technique },
        { trait_type: "Tanggal Terbit", value: issuedAt },
        { trait_type: "Date", value: issuedAt },
        ...materials.map((material) => ({ trait_type: "Bahan", value: material }))
      ]
    };

    // Upload metadata ke IPFS untuk gas yang sangat murah!
    let tokenURI;
    const PINATA_API_KEY = process.env.PINATA_API_KEY;
    const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

    if (PINATA_API_KEY && PINATA_SECRET_KEY) {
      try {
        const axios = (await import("axios")).default;
        const pinataRes = await axios.post(
          "https://api.pinata.cloud/pinning/pinJSONToIPFS",
          metadata,
          {
            headers: {
              "Content-Type": "application/json",
              pinata_api_key: PINATA_API_KEY,
              pinata_secret_api_key: PINATA_SECRET_KEY,
            }
          }
        );
        const metadataHash = pinataRes.data.IpfsHash;
        tokenURI = `ipfs://${metadataHash}`;
        console.log("✅ Metadata uploaded to IPFS:", tokenURI);
      } catch (ipfsError) {
        console.warn("⚠️ IPFS metadata upload failed, falling back to on-chain:", ipfsError.message);
        tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
      }
    } else {
      // Fallback ke on-chain jika tidak ada Pinata keys
      tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
    }

    // 6. Inisialisasi Kontrak
    const ABI = ["function cetakSertifikat(address,string,string) public returns (uint256)"];
    const contract = new ethers.Contract(contractAddress, ABI, wallet);

    console.log(`Mengestimasi gas untuk pencetakan NFT ${namaPengrajin}...`);

    // 7. Estimasi Gas Dinamis dengan Safety Buffer
    let gasLimit;
    try {
      const estimatedGas = await contract.cetakSertifikat.estimateGas(recipient, tokenURI, uidNFC);
      // Tambahkan Buffer 30% (untuk data besar seperti gambar)
      gasLimit = (estimatedGas * 130n) / 100n;
      console.log(`🟢 Gas Terestimasi: ${estimatedGas.toString()}, Dengan Buffer 30%: ${gasLimit.toString()}`);
    } catch (gasError) {
      console.warn("⚠️ Gagal estimasi gas, menggunakan fallback gas limit:", gasError.message);
      gasLimit = 3000000n; // Fallback lebih besar untuk data dengan gambar
    }

    // 8. Eksekusi Transaksi
    const tx = await contract.cetakSertifikat(recipient, tokenURI, uidNFC, { gasLimit });

    console.log("✅ Transaksi dikirim. Hash:", tx.hash);

    // Tunggu 1 konfirmasi (Ethers v6: tx.wait())
    const receipt = await tx.wait();

    // 9. Ambil Token ID dari event logs (jika ada)
    let tokenId = "unknown";
    try {
      // Cari event Transfer (topic untuk Transfer: 0xddf252ad...)
      const transferEvent = receipt.logs.find(log =>
        log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      );
      if (transferEvent && transferEvent.topics[3]) {
        tokenId = BigInt(transferEvent.topics[3]).toString();
      }
    } catch {
      console.warn("Tidak dapat mengekstrak Token ID dari event blockchain.");
      tokenId = "unknown";
    }

    let ownershipLinked = false;
    if (/^\d+$/.test(tokenId)) {
      try {
        await registerNewCertificate(tokenId, user.id);
        ownershipLinked = true;
      } catch (linkError) {
        // The blockchain mint is already final; let the user know not to mint again.
        console.error(`Gagal menautkan Token #${tokenId} ke akun:`, linkError.message);
      }
    }

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      recipient: recipient,
      tokenId: tokenId,
      issuedAt,
      ownershipLinked,
      warning: ownershipLinked ? undefined : "Sertifikat tercetak, tetapi belum tertaut ke akun. Admin NBC perlu menautkannya dari dashboard.",
      verifyUrl: /^\d+$/.test(tokenId) ? `/verify?id=${tokenId}` : "/verify"
    });

  } catch (error) {
    console.error("ERROR MINTING SERVICE:", error);

    // SEDANG-3: Pesan error yang aman (tidak membocorkan detail internal)
    let userMessage = "Terjadi kesalahan saat mencetak sertifikat.";

    if (error.message?.includes("insufficient funds")) {
      userMessage = "Saldo Wallet Admin tidak mencukupi untuk membayar Gas Fee.";
    } else if (error.message?.includes("NFC UID sudah terdaftar")) {
      userMessage = "NFC UID ini sudah terdaftar. Gunakan NFC tag lain.";
    }

    return safeErrorResponse(error, userMessage);
  }
}
