import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request) {
  try {
    // 1. Validasi API Key
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: "Konfigurasi Server Error: API Key tidak ditemukan" }, { status: 500 });
    }

    // 2. Ambil & Validasi Data Payload
    const body = await request.json().catch(() => ({}));
    const { namaPengrajin, filosofi, imageBase64 } = body;

    if (!namaPengrajin || !filosofi || !imageBase64) {
      return NextResponse.json(
        { error: "Data tidak lengkap. Pastikan nama pengrajin, filosofi, dan gambar sudah terisi." },
        { status: 400 }
      );
    }

    // 3. Inisialisasi Gemini & Deteksi Format Gambar
    const genAI = new GoogleGenerativeAI(geminiKey);

    // Parsing MIME type dan data dari Base64 string
    // Format biasanya: "data:image/jpeg;base64,..."
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg"; // Fallback ke jpeg jika gagal deteksi
    const base64Data = imageBase64.split(",")[1] || imageBase64;

    const prompt = `Kamu adalah Kurator Seni Batik Profesional dengan keahlian menganalisis motif batik Indonesia.

TUGAS: Analisis gambar batik ini dan buat deskripsi sertifikat keaslian.

ANALISIS VISUAL:
1. MOTIF: Jika mirip motif tradisional (parang, kawung, mega mendung, dll), sebutkan. 
   Jika TIDAK mirip motif tradisional, deskripsikan sebagai "motif kreasi/kontemporer" dan jelaskan bentuk-bentuk yang kamu lihat (flora, fauna, geometris, abstrak, dll).
2. WARNA: Deskripsikan warna dominan dan kombinasinya
3. KESAN VISUAL: Apa yang membuat batik ini unik/menarik

INFORMASI PENGRAJIN:
- Nama: "${namaPengrajin}"
- Filosofi dari pengrajin: "${filosofi}"

INSTRUKSI OUTPUT:
Buat 1 paragraf deskripsi sertifikat (maksimal 100 kata) yang:
- Mendeskripsikan apa yang TERLIHAT di gambar (jangan menebak jika tidak yakin)
- Menghubungkan visual dengan filosofi pengrajin
- Mengapresiasi nilai artistik dan budaya karya ini

Bahasa Indonesia yang puitis dan otentik.`;

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
    console.error("AI Route Error:", error);
    return NextResponse.json(
      { error: "Gagal analisis AI: " + (error.message || "Terjadi kesalahan internal") },
      { status: error.status || 500 }
    );
  }
}
