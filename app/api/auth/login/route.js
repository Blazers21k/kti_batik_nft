import { NextResponse } from "next/server";
import { ethers } from "ethers";

// Daftar pengrajin terdaftar
// Dalam production, ini bisa dari database
// Untuk demo, kita generate dari data blockchain
const REGISTERED_PENGRAJIN = {};

export async function POST(request) {
  try {
    // Request Logging
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'local';
    console.log(`📝 [${new Date().toISOString()}] ${ip} → POST /api/auth/login`);

    const { nama, kodeAkses } = await request.json();

    if (!nama || !kodeAkses) {
      return NextResponse.json(
        { error: "Nama dan kode akses harus diisi" },
        { status: 400 }
      );
    }

    // Verifikasi kode akses
    // Kode akses = hash(nama + admin_address) -> 6 digit
    const adminAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const expectedCode = generateAccessCode(nama, adminAddress);

    if (kodeAkses !== expectedCode) {
      return NextResponse.json(
        { error: "Nama atau kode akses salah" },
        { status: 401 }
      );
    }

    // Query blockchain untuk menghitung total karya
    let totalKarya = 0;
    try {
      const alchemyUrl = process.env.ALCHEMY_RPC_URL;
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

      if (alchemyUrl && contractAddress) {
        const provider = new ethers.JsonRpcProvider(alchemyUrl);
        const abi = [
          "function totalSupply() view returns (uint256)",
          "function tokenURI(uint256 tokenId) view returns (string)"
        ];
        const contract = new ethers.Contract(contractAddress, abi, provider);

        const total = await contract.totalSupply();
        const totalNum = Number(total);

        // Check each token for matching pengrajin name
        for (let i = 1; i <= totalNum; i++) {
          try {
            const uri = await contract.tokenURI(i);
            // Parse metadata to check pengrajin name
            if (uri.includes("ipfs") || uri.startsWith("http")) {
              // Will be checked on frontend via gallery API
            }
          } catch (e) {
            // Token might not exist, skip
          }
        }
        totalKarya = totalNum; // Approximate, frontend will filter
      }
    } catch (e) {
      console.log("Blockchain query failed:", e.message);
    }

    console.log(`✅ Login berhasil: ${nama}`);

    return NextResponse.json({
      success: true,
      nama: nama,
      alamat: "-",
      totalKarya: totalKarya,
      message: "Login berhasil"
    });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// Generate kode akses deterministic dari nama pengrajin
function generateAccessCode(nama, contractAddress) {
  const input = `${nama.toLowerCase().trim()}:${contractAddress || "NBC"}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Ambil 6 digit positif
  const code = Math.abs(hash % 1000000).toString().padStart(6, '0');
  return code;
}

// GET endpoint untuk generate kode akses (admin only)
export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'local';
  console.log(`📝 [${new Date().toISOString()}] ${ip} → GET /api/auth/login`);

  const { searchParams } = new URL(request.url);
  const nama = searchParams.get("nama");
  const adminKey = searchParams.get("key");

  // Proteksi: hanya admin yang bisa generate kode
  if (adminKey !== process.env.ADMIN_PRIVATE_KEY?.slice(-8)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  if (!nama) {
    return NextResponse.json(
      { error: "Parameter 'nama' diperlukan" },
      { status: 400 }
    );
  }

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const code = generateAccessCode(nama, contractAddress);

  return NextResponse.json({
    nama: nama,
    kodeAkses: code,
    message: `Kode akses untuk ${nama}: ${code}`
  });
}
