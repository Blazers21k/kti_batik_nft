import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { enforceRateLimit, sanitizeInput, safeErrorResponse, validatePayloadSize, validateImageBase64 } from "../../lib/security";
import { getClientIP } from "../../lib/rate-limit";

export async function POST(request) {
  try {
    // TINGGI-1: Rate Limit — 5 analisis AI per menit per IP
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 5 });
    if (rateLimitError) return rateLimitError;

    // SEDANG-2: Validasi ukuran payload (max 10MB)
    const payloadError = await validatePayloadSize(request, 10 * 1024 * 1024);
    if (payloadError) return payloadError;

    // Request Logging
    const ip = getClientIP(request);
    console.log(`📝 [${new Date().toISOString()}] ${ip} → POST /api/ai-preview`);

    // 1. Validasi API Key
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: "Konfigurasi Server Error: API Key tidak ditemukan" }, { status: 500 });
    }

    // 2. Ambil & Validasi Data Payload (dengan sanitasi)
    const body = await request.json().catch(() => ({}));
    const namaPengrajin = sanitizeInput(body.namaPengrajin, 200);
    const filosofi = sanitizeInput(body.filosofi, 2000);
    const imageBase64 = body.imageBase64;

    if (!namaPengrajin || !filosofi || !imageBase64) {
      return NextResponse.json(
        { error: "Data tidak lengkap. Pastikan nama pengrajin, filosofi, dan gambar sudah terisi." },
        { status: 400 }
      );
    }

    // RENDAH-4: Validasi MIME type gambar
    const imageValidation = validateImageBase64(imageBase64);
    if (!imageValidation.valid) {
      return NextResponse.json({ error: imageValidation.error }, { status: 400 });
    }

    // 3. Inisialisasi Gemini
    const genAI = new GoogleGenerativeAI(geminiKey);
    const { mimeType, base64Data } = imageValidation;

    // SEDANG-1: Input sudah disanitasi sebelum masuk ke prompt
    // Nama dan filosofi sudah melewati sanitizeInput() yang menghapus control chars
    const prompt = `Kamu adalah Kurator Seni Batik Profesional dan Ahli Hak Kekayaan Intelektual yang berspesialisasi dalam analisis motif batik Indonesia. Tugasmu adalah menganalisis gambar batik secara visual lalu menyusun "Uraian Ciptaan" resmi yang terstruktur.

═══════════════════════════════════════
DATA INPUT DARI PENGRAJIN:
═══════════════════════════════════════
• Nama Pencipta: "${namaPengrajin}"
• Filosofi/Cerita dari Pencipta: "${filosofi}"

═══════════════════════════════════════
INSTRUKSI ANALISIS GAMBAR:
═══════════════════════════════════════
Analisis gambar batik yang diberikan secara cermat. Perhatikan:
1. MOTIF UTAMA — Identifikasi bentuk dominan. Jika mirip motif klasik (parang, kawung, mega mendung, truntum, sidoluhur, buketan, dll), sebutkan nama motifnya. Jika TIDAK mirip motif tradisional manapun, deskripsikan sebagai "motif kreasi kontemporer" dan jelaskan bentuk visual yang terlihat (flora, fauna, geometris, abstrak, dsb). JANGAN menebak nama motif jika tidak yakin.
2. ISEN-ISEN — Cari elemen pengisi kecil di antara motif utama (cecek/titik, sawut/garis pendek, galaran, ukel, gringsing, dll). Jika tidak terlihat jelas, tulis "tidak teridentifikasi secara visual".
3. WARNA — Identifikasi warna dominan, warna sekunder, dan kombinasi/kontrasnya. Jika memungkinkan, perkirakan jenis pewarna (sogan/cokelat klasik, wedelan/biru indigo, pewarna alam, atau pewarna sintetis).
4. TATA LETAK — Deskripsikan susunan motif di atas kain (simetris, diagonal/miring, menyebar/acak, berulang/repetitif, radial, dll).

═══════════════════════════════════════
FORMAT OUTPUT — URAIAN CIPTAAN:
═══════════════════════════════════════
Tulis output PERSIS mengikuti struktur di bawah ini. Gunakan format teks biasa (BUKAN markdown). Setiap bagian harus terisi berdasarkan analisis visual gambar dan data pengrajin.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URAIAN CIPTAAN KARYA BATIK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【BAGIAN 1 — IDENTITAS KARYA】
• Judul Ciptaan    : [Buat nama judul yang puitis berdasarkan motif dan filosofi, contoh: "Batik Parang Kusuma — Keindahan yang Mengalir"]
• Jenis Ciptaan    : Seni Motif Batik
• Nama Pencipta    : ${namaPengrajin}

【BAGIAN 2 — DESKRIPSI VISUAL TEKNIS】
• Komposisi Motif Utama : [Hasil analisis motif dari gambar — 2-3 kalimat deskriptif]
• Isen-isen (Motif Pengisi) : [Elemen pengisi yang teridentifikasi]
• Kombinasi Warna : [Warna dominan, sekunder, jenis pewarna jika teridentifikasi]
• Tata Letak : [Pola susunan motif di kain]

【BAGIAN 3 — NILAI TAMBAH & FILOSOFI】
• Makna Filosofis : [Gabungkan filosofi dari pengrajin dengan makna visual motif — 2-3 kalimat yang puitis dan mendalam]
• Metode Pembuatan : Karya batik tulis manual menggunakan canting dan malam (lilin batik) di atas kain. Setiap goresan dibuat dengan tangan oleh pengrajin, menjadikan setiap lembar kain sebagai karya seni unik yang tidak dapat direplikasi secara identik.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

═══════════════════════════════════════
ATURAN KETAT:
═══════════════════════════════════════
1. Output HANYA berisi uraian ciptaan di atas — TANPA pembuka, penutup, atau komentar tambahan.
2. Gunakan Bahasa Indonesia baku yang puitis dan otentik.
3. Bagian 2 WAJIB berdasarkan apa yang benar-benar TERLIHAT di gambar — jangan berasumsi atau mengarang detail yang tidak ada.
4. Judul ciptaan harus unik, bermakna, dan mencerminkan esensi visual + filosofi karya.
5. Jaga konsistensi format — gunakan simbol dan separator PERSIS seperti template di atas.`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    // 4. Logika Generate dengan Auto-Fallback
    const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
    let lastError = null;

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();

        return NextResponse.json({
          success: true,
          result: text,
          modelUsed: modelName // Informasikan model mana yang berhasil (opsional)
        });
      } catch (error) {
        lastError = error;
        // Pindah ke model berikutnya jika limit (429) atau error tertentu tercapai
        if (error.status === 429 || error.message?.includes("429")) {
          console.warn(`Model ${modelName} mencapai limit. Mencoba fallback ke model berikutnya...`);
          continue;
        }
        // Jika error fundamental lain, langsung throw
        throw error;
      }
    }

    // Jika semua model gagal
    throw lastError;

  } catch (error) {
    // SEDANG-3: Pesan error yang aman
    return safeErrorResponse(error, "Gagal menganalisis gambar. Silakan coba lagi.");
  }
}
