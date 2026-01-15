import { ethers } from "ethers";
import { NextResponse } from "next/server";

// DECENTRALIZED: Menggunakan ECDSA signature (sama seperti Ethereum)
// Siapapun bisa verify dengan public address, tanpa perlu server

export async function POST(request) {
  try {
    console.log("🔵 [Backend] Memulai proses Minting Final...");

    // 1. Validasi Konfigurasi Blockchain
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const alchemyUrl = process.env.ALCHEMY_RPC_URL;

    if (!privateKey || !contractAddress || !alchemyUrl) {
      return NextResponse.json(
        { error: "Konfigurasi Blockchain (Private Key/Contract/RPC) tidak lengkap di server." },
        { status: 500 }
      );
    }

    // 2. Ambil & Validasi Input Data
    const body = await request.json().catch(() => ({}));
    const { namaPengrajin, uidNFC, alamatPengrajin, namaVerifikator, finalDescription, imageBase64, ipfsUrl } = body;

    // Guard Clauses untuk Validasi Input
    if (!uidNFC) return NextResponse.json({ error: "NFC UID wajib diisi." }, { status: 400 });
    if (!finalDescription) return NextResponse.json({ error: "Deskripsi sertifikat tidak boleh kosong." }, { status: 400 });
    if (!namaPengrajin) return NextResponse.json({ error: "Nama pengrajin wajib ada untuk metadata." }, { status: 400 });
    if (!namaVerifikator) return NextResponse.json({ error: "Nama verifikator wajib ada." }, { status: 400 });

    // 3. Setup Provider & Wallet (Ethers v6)
    const provider = new ethers.JsonRpcProvider(alchemyUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // 4. Logika Penentuan Penerima (Recipient)
    // Validasi alamat Ethereum sederhana (42 karakter, diawali 0x)
    const isValidAddress = (addr) => addr && addr.length === 42 && addr.startsWith("0x");
    const recipient = isValidAddress(alamatPengrajin) ? alamatPengrajin : wallet.address;

    if (recipient === wallet.address) {
      console.log("ℹ️ Alamat pengrajin tidak valid/kosong, NFT akan dikirim ke Admin Wallet.");
    }

    // 5. Konstruksi Metadata & TokenURI
    // Support IPFS URL atau base64
    if (!imageBase64 && !ipfsUrl) {
      return NextResponse.json({ error: "Foto batik wajib diupload." }, { status: 400 });
    }
    // Preferensikan IPFS URL karena lebih murah (gas)
    const imageData = ipfsUrl || imageBase64;

    const metadata = {
      name: `Batik Karya ${namaPengrajin}`,
      description: finalDescription,
      image: imageData,
      attributes: [
        { trait_type: "NFC UID", value: uidNFC },
        { trait_type: "Verified By", value: namaVerifikator },
        { trait_type: "Date", value: new Date().toISOString() }
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

    console.log(`🚀 Mengestimasi gas untuk pencetakan NFT ${namaPengrajin}...`);

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
    // Untuk saat ini, kita generate signature berdasarkan txHash + NFC UID
    // Token ID bisa diambil dari event Transfer di receipt.logs
    let tokenId = "unknown";
    try {
      // Cari event Transfer (topic untuk Transfer: 0xddf252ad...)
      const transferEvent = receipt.logs.find(log =>
        log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      );
      if (transferEvent && transferEvent.topics[3]) {
        tokenId = BigInt(transferEvent.topics[3]).toString();
      }
    } catch (e) {
      console.log("ℹ️ Tidak dapat mengekstrak Token ID dari logs, menggunakan hash.");
      tokenId = tx.hash.substring(0, 10);
    }

    // 10. Generate DECENTRALIZED QR Signature using ECDSA
    // Signature ini bisa diverifikasi oleh siapapun dengan public address
    const message = `batikchain:${tokenId}:${uidNFC}`;
    const qrSignature = await wallet.signMessage(message);
    console.log(`🔐 ECDSA Signature generated untuk Token #${tokenId}`);
    console.log(`📍 Admin Address (untuk verify): ${wallet.address}`);

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      recipient: recipient,
      tokenId: tokenId,
      qrSignature: qrSignature,
      // Admin address untuk verifikasi publik (DECENTRALIZED!)
      adminAddress: wallet.address,
      // URL untuk QR Code - signature di-encode untuk URL safety
      verifyUrl: `/verify?id=${tokenId}&sig=${encodeURIComponent(qrSignature)}`
    });

  } catch (error) {
    console.error("💥 ERROR MINTING SERVICE:", error);

    // Deteksi error spesifik jika bisa
    let status = 500;
    let message = error.message || "Terjadi kesalahan internal saat minting.";

    if (message.includes("insufficient funds")) {
      message = "Saldo Wallet Admin tidak mencukupi untuk membayar Gas Fee.";
    }

    return NextResponse.json({ error: message }, { status });
  }
}
