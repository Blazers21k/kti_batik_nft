import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { enforceRateLimit, sanitizeInput, safeErrorResponse } from "../../../lib/security";
import { getClientIP } from "../../../lib/rate-limit";
import { authenticateUser } from "../../../lib/auth";

// ═══════════════════════════════════════
// KODE AKSES PENGRAJIN — Legacy System
// ═══════════════════════════════════════

function generateAccessCode(nama, salt) {
  const input = `${nama.toLowerCase().trim()}:${salt || "NBC-DEFAULT-SALT"}`;
  const hash = ethers.keccak256(ethers.toUtf8Bytes(input));
  const code = parseInt(hash.slice(2, 10), 16) % 1000000;
  return code.toString().padStart(6, "0");
}

// ═══════════════════════════════════════
// POST /api/auth/login — Login (Dual Mode)
// ═══════════════════════════════════════

export async function POST(request) {
  try {
    // Rate Limit: 10 percobaan login per menit per IP
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 10 });
    if (rateLimitError) return rateLimitError;

    const ip = getClientIP(request);
    console.log(`📝 [${new Date().toISOString()}] ${ip} → POST /api/auth/login`);

    const body = await request.json().catch(() => ({}));

    // ═══════════════════════════════════
    // MODE 1: Login User (email + password)
    // ═══════════════════════════════════
    if (body.email && body.password) {
      const email = sanitizeInput(body.email, 200);
      const password = body.password;

      if (!email || !password) {
        return NextResponse.json(
          { error: "Email dan password harus diisi" },
          { status: 400 }
        );
      }

      const result = await authenticateUser(email, password);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 401 }
        );
      }

      console.log(`✅ Login user berhasil: ${result.user.email}`);

      return NextResponse.json({
        success: true,
        mode: "user",
        user: result.user,
        token: result.token,
        message: "Login berhasil",
      });
    }

    // ═══════════════════════════════════
    // MODE 2: Login Pengrajin (nama + kodeAkses)
    // ═══════════════════════════════════
    const nama = sanitizeInput(body.nama, 100);
    const kodeAkses = sanitizeInput(body.kodeAkses, 10);

    if (!nama || !kodeAkses) {
      return NextResponse.json(
        { error: "Data login tidak lengkap" },
        { status: 400 }
      );
    }

    // Verifikasi kode akses pengrajin
    const salt = process.env.ADMIN_API_SECRET;
    const expectedCode = generateAccessCode(nama, salt);

    if (kodeAkses !== expectedCode) {
      return NextResponse.json(
        { error: "Nama atau kode akses salah" },
        { status: 401 }
      );
    }

    // Query blockchain untuk total karya
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
        totalKarya = Number(total);
      }
    } catch (e) {
      console.log("Blockchain query failed:", e.message);
    }

    console.log(`✅ Login pengrajin berhasil: ${nama}`);

    return NextResponse.json({
      success: true,
      mode: "pengrajin",
      nama: nama,
      alamat: "-",
      totalKarya: totalKarya,
      message: "Login berhasil",
    });

  } catch (error) {
    return safeErrorResponse(error, "Terjadi kesalahan saat login.");
  }
}

// ═══════════════════════════════════════
// GET /api/auth/login — Generate Kode Akses (Admin Only)
// ═══════════════════════════════════════

export async function GET(request) {
  const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 5 });
  if (rateLimitError) return rateLimitError;

  const ip = getClientIP(request);
  console.log(`📝 [${new Date().toISOString()}] ${ip} → GET /api/auth/login`);

  const { searchParams } = new URL(request.url);
  const nama = searchParams.get("nama");
  const adminKey = searchParams.get("key");

  const adminSecret = process.env.ADMIN_API_SECRET;

  if (!adminSecret) {
    return safeErrorResponse(null, "Konfigurasi admin belum lengkap.", 500);
  }

  if (adminKey !== adminSecret) {
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

  const salt = process.env.ADMIN_API_SECRET;
  const code = generateAccessCode(nama, salt);

  return NextResponse.json({
    nama: nama,
    kodeAkses: code,
    message: `Kode akses untuk ${nama}: ${code}`
  });
}
