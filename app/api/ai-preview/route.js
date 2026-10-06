import { NextResponse } from "next/server";
import { enforceRateLimit, sanitizeInput, safeErrorResponse, validatePayloadSize, validateImageBase64 } from "../../lib/security";
import { getClientIP } from "../../lib/rate-limit";
import { analyzeBatikWithRAG, analyzeBatikDirect } from "../../lib/rag/pipeline";

export async function POST(request) {
  const requestId = crypto.randomUUID();

  try {
    const rateLimitError = enforceRateLimit(request, { windowMs: 60000, max: 5 });
    if (rateLimitError) return rateLimitError;

    const payloadError = await validatePayloadSize(request, 10 * 1024 * 1024);
    if (payloadError) return payloadError;

    const ip = getClientIP(request);
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      component: "ai-preview",
      event: "request",
      ip,
    }));

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Konfigurasi Server Error: API Key tidak ditemukan" }, { status: 500 });
    }

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

    const imageValidation = validateImageBase64(imageBase64);
    if (!imageValidation.valid) {
      return NextResponse.json({ error: imageValidation.error }, { status: 400 });
    }

    try {
      const ragResult = await analyzeBatikWithRAG({
        imageBase64,
        filosofi,
        namaPengrajin,
        requestId,
      });

      return NextResponse.json({
        success: true,
        result: ragResult.uraian,
        references: ragResult.references || [],
        visualAnalysis: ragResult.visualAnalysis || null,
        ragMeta: ragResult.ragMeta || null,
        modelUsed: ragResult.modelUsed,
        ragUsed: true,
        requestId,
      });
    } catch (ragError) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId,
        component: "ai-preview",
        event: "rag_fallback",
        error: ragError.message,
      }));

      const directResult = await analyzeBatikDirect({
        imageBase64,
        filosofi,
        namaPengrajin,
        requestId,
      });

      return NextResponse.json({
        success: true,
        result: directResult.uraian,
        references: [],
        visualAnalysis: directResult.visualAnalysis || null,
        modelUsed: directResult.modelUsed,
        ragUsed: false,
        requestId,
      });
    }
  } catch (error) {
    return safeErrorResponse(error, "Gagal menganalisis gambar. Silakan coba lagi.");
  }
}
