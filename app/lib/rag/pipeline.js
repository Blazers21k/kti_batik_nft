import { Type } from "@google/genai";
import { embedText } from "./embedding.js";
import { search } from "./vector-store.js";
import { GEMINI_MODELS, getGeminiClient, isRetryableModelError } from "./gemini-client.js";

const RAG_CONFIG = {
  retrievalTopK: Number(process.env.RAG_RETRIEVAL_TOP_K || 8),
  maxReferences: Number(process.env.RAG_MAX_REFERENCES || 3),
  minSimilarity: Number(process.env.RAG_MIN_SIMILARITY || 0.42),
  minFinalScore: Number(process.env.RAG_MIN_FINAL_SCORE || 0.45),
  strongScore: Number(process.env.RAG_STRONG_SCORE || 0.70),
  possibleScore: Number(process.env.RAG_POSSIBLE_SCORE || 0.52),
};

function nowMs() {
  return Date.now();
}

function logEvent(requestId, stage, fields = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId,
    component: "batik-rag",
    stage,
    ...fields,
  }));
}

function extractImage(imageBase64) {
  const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error("Format gambar tidak valid");
  return { mimeType: match[1], base64Data: match[2] };
}

function cleanJsonText(text) {
  return String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function tokenize(text) {
  const stopWords = new Set([
    "dan", "yang", "dengan", "dari", "pada", "atau", "untuk", "ini", "itu", "seperti",
    "terlihat", "terdapat", "memiliki", "motif", "batik", "warna", "bagian", "atas", "kain",
    "secara", "utama", "dominan", "lebih", "juga", "dapat", "akan", "ada", "sebuah",
  ]);
  return new Set(String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(token => token.length > 2 && !stopWords.has(token)));
}

function overlapScore(queryTokens, text) {
  const candidateTokens = tokenize(text);
  if (queryTokens.size === 0 || candidateTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) overlap += 1;
  }
  return Math.min(1, overlap / Math.max(4, queryTokens.size * 0.5));
}

function buildVisualQuery(observation) {
  const shapes = (observation.bentuk_pola_utama || []).join(", ");
  const colors = (observation.warna_terlihat || []).join(", ");
  const isen = (observation.isen_isen_terlihat || []).join(", ");
  const layout = (observation.tata_letak || []).join(", ");
  const texture = (observation.tekstur_garis || []).join(", ");

  // Repetition bertujuan membuat ciri visual lebih dominan di embedding query.
  return [
    `OBSERVASI VISUAL: ${shapes}`,
    `OBSERVASI VISUAL: ${shapes}`,
    `WARNA TERLIHAT: ${colors}`,
    `ISEN-ISEN TERLIHAT: ${isen}`,
    `TATA LETAK: ${layout}`,
    `TEKSTUR DAN GARIS: ${texture}`,
    `KEPASTIAN OBSERVASI: hanya gunakan fitur yang benar-benar terlihat.`,
  ].filter(Boolean).join(". ");
}

async function analyzeImageVisual(imageBase64, modelName = GEMINI_MODELS.primary, requestId = "-") {
  const started = nowMs();
  const genAI = getGeminiClient();
  const responseSchema = {
      type: Type.OBJECT,
      properties: {
        bentuk_pola_utama: { type: Type.ARRAY, items: { type: Type.STRING } },
        warna_terlihat: { type: Type.ARRAY, items: { type: Type.STRING } },
        isen_isen_terlihat: { type: Type.ARRAY, items: { type: Type.STRING } },
        tata_letak: { type: Type.ARRAY, items: { type: Type.STRING } },
        tekstur_garis: { type: Type.ARRAY, items: { type: Type.STRING } },
        bukti_teknik_visual: { type: Type.ARRAY, items: { type: Type.STRING } },
        ketidakpastian: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["bentuk_pola_utama", "warna_terlihat", "isen_isen_terlihat", "tata_letak", "tekstur_garis", "bukti_teknik_visual", "ketidakpastian"],
    };

  const { mimeType, base64Data } = extractImage(imageBase64);
  const prompt = `Analisis gambar batik secara VISUAL dan hanya berdasarkan apa yang benar-benar terlihat.

Jangan menebak atau menyebut nama motif tradisional, daerah asal, filosofi, sejarah, teknik produksi, atau jenis pewarna tertentu hanya karena kamu merasa mirip. Tahap ini adalah ekstraksi fitur visual untuk retrieval RAG.

Aturan:
- bentuk_pola_utama: bentuk geometris/flora/fauna/organik dan arah/karakter pola yang tampak.
- warna_terlihat: nama warna yang tampak secara kasatmata; jangan menyimpulkan bahan pewarna.
- isen_isen_terlihat: titik, garis pendek, mlinjon, cecek, sawut, dan elemen kecil lain hanya bila terlihat.
- tata_letak: diagonal, berulang, simetris, menyebar, radial, blok, dan sebagainya.
- tekstur_garis: halus, tegas, tidak seragam, repetitif, dan ciri garis lain yang terlihat.
- bukti_teknik_visual: indikator visual yang MUNGKIN berkaitan dengan teknik; boleh kosong jika foto tidak cukup untuk menentukannya.
- ketidakpastian: hal-hal yang tidak dapat dipastikan dari gambar.

Keluarkan JSON sesuai schema tanpa markdown.`;

  const result = await genAI.models.generateContent({
    model: modelName,
    contents: [prompt, { inlineData: { data: base64Data, mimeType } }],
    config: { responseMimeType: "application/json", responseSchema, temperature: 0.1 },
  });
  const parsed = JSON.parse(cleanJsonText(result.text));
  logEvent(requestId, "visual_analysis_complete", { durationMs: nowMs() - started });
  return parsed;
}

function rerankReferences(results, observation) {
  const queryTokens = tokenize(buildVisualQuery(observation));

  return results.map(result => {
    const motif = result.motif;
    const visualText = [
      motif.ciri_visual,
      motif.sub_kategori,
      motif.kategori,
      ...(motif.isen_isen || []),
    ].filter(Boolean).join(" ");
    const colorText = (motif.warna_tradisional || []).join(" ");
    const layoutText = motif.ciri_visual || "";

    const visualOverlap = overlapScore(queryTokens, visualText);
    const colorOverlap = overlapScore(queryTokens, colorText);
    const layoutOverlap = overlapScore(queryTokens, layoutText);

    const finalScore = Math.max(0, Math.min(1,
      (result.similarity * 0.65) +
      (visualOverlap * 0.20) +
      (colorOverlap * 0.05) +
      (layoutOverlap * 0.10)
    ));

    return { ...result, visualOverlap, colorOverlap, layoutOverlap, finalScore };
  }).sort((a, b) => b.finalScore - a.finalScore);
}

function matchLevel(score) {
  if (score >= RAG_CONFIG.strongScore) return "strong";
  if (score >= RAG_CONFIG.possibleScore) return "possible";
  return "weak";
}

function selectReferences(results) {
  if (!results.length) return [];

  const selected = results.filter((r, index) => {
    if (r.similarity < RAG_CONFIG.minSimilarity) return false;
    if (r.finalScore < RAG_CONFIG.minFinalScore) return false;
    if (index > 0 && r.finalScore < results[0].finalScore - 0.12) return false;
    return true;
  }).slice(0, RAG_CONFIG.maxReferences);

  return selected.map((result, index) => ({
    ...result,
    rank: index + 1,
    matchLevel: matchLevel(result.finalScore),
  }));
}

function sourceString(sources = []) {
  return sources.map(source => {
    if (source.tipe === "buku") return `${source.penulis} (${source.tahun}). "${source.judul}"`;
    return source.nama || source.judul || "";
  }).filter(Boolean).join("; ") || "Tidak tersedia";
}

function referencesContext(references) {
  if (!references.length) return "TIDAK ADA REFERENSI MOTIF YANG MELEWATI AMBANG RELEVANSI. Jangan mengarang referensi.";

  return references.map((ref, i) => {
    const m = ref.motif;
    const k = ref.knowledge || {};
    const related = (k.related || []).filter(r => r.resolved).map(r => r.nama).join(", ") || "Tidak tersedia";
    return `[Referensi ${i + 1}] Kekuatan kecocokan: ${ref.matchLevel} | vectorSimilarity=${ref.similarity.toFixed(3)} | finalScore=${ref.finalScore.toFixed(3)}
Nama Motif: ${m.nama}
Daerah Asal: ${m.daerah_asal}
Ciri Visual Referensi: ${m.ciri_visual}
Isen-isen Referensi: ${(m.isen_isen || []).join(", ") || "-"}
Warna Referensi: ${(m.warna_tradisional || []).join(", ") || "-"}
Teknik Referensi: ${k.technique?.nama || m.teknik || "-"}
Knowledge Daerah: ${(k.regions || []).map(r => r.nama).join(", ") || "-"}
Knowledge Warna: ${(k.colors || []).map(c => `${c.nama}: ${c.makna}`).join("; ") || "-"}
Relasi Motif yang TERIDENTIFIKASI: ${related}
Konteks Budaya: ${m.konteks_budaya || "-"}
Sumber: ${sourceString(m.sumber)}`;
  }).join("\n\n");
}

const GENERATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    judul: { type: Type.STRING },
    jenis_ciptaan: { type: Type.STRING },
    nama_pencipta: { type: Type.STRING },
    komposisi_motif_utama: { type: Type.STRING },
    isen_isen: { type: Type.STRING },
    kombinasi_warna: { type: Type.STRING },
    tata_letak: { type: Type.STRING },
    makna_filosofis: { type: Type.STRING },
    konteks_budaya: { type: Type.STRING },
    metode_pembuatan: { type: Type.STRING },
  },
  required: ["judul", "jenis_ciptaan", "nama_pencipta", "komposisi_motif_utama", "isen_isen", "kombinasi_warna", "tata_letak", "makna_filosofis", "konteks_budaya", "metode_pembuatan"],
};

function buildGenerationPrompt({ filosofi, namaPengrajin, observation, references }) {
  return `Kamu adalah kurator seni batik yang menyusun uraian ciptaan secara grounded.

DATA PENGRAJIN
Nama Pencipta: "${namaPengrajin}"
Filosofi/Cerita Pencipta: "${filosofi}"

OBSERVASI VISUAL DARI GAMBAR
${JSON.stringify(observation, null, 2)}

REFERENSI KNOWLEDGE BASE
${referencesContext(references)}

ATURAN GROUNDING
1. Bedakan dengan tegas antara OBSERVASI GAMBAR dan DATA REFERENSI.
2. Jangan menyatakan sebuah karya identik dengan motif referensi. Gunakan frasa seperti "memiliki kemiripan unsur visual dengan" bila relevan.
3. Referensi dengan matchLevel=weak tidak boleh dipakai sebagai dasar klaim spesifik.
4. Jangan menyebut daerah, filosofi, sejarah, teknik, atau makna budaya sebagai fakta karya hanya karena ada di database; gunakan hanya sebagai konteks perbandingan.
5. Jangan mengarang isen-isen. Bila tidak terlihat, tulis "tidak teridentifikasi secara visual".
6. Jangan mengklaim jenis pewarna berdasarkan foto saja. Kamu boleh menyebut warna yang terlihat dan menjelaskan bahwa jenis pewarna tidak dapat dipastikan dari gambar bila memang demikian.
7. Jangan mengklaim teknik pembuatan karya dari foto saja. Untuk metode_pembuatan, tulis "Tidak dapat dipastikan hanya dari foto; data metode produksi aktual perlu dikonfirmasi oleh pengrajin." kecuali pengamatan visual benar-benar memberi indikator dan tetap nyatakan sebagai indikasi, bukan kepastian.
8. Filosofi pengrajin adalah informasi yang diberikan pengguna; pertahankan makna intinya tanpa menambahkan klaim sejarah yang tidak diberikan.
9. Bila tidak ada referensi yang cukup relevan, nyatakan karya sebagai kreasi dengan ciri visual yang teridentifikasi, tanpa memaksa nama motif tradisional.
10. Judul boleh puitis, tetapi jangan mengubah fakta teknis.

Keluarkan JSON sesuai schema. Jangan gunakan markdown.`;
}

function formatUraian(data) {
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URAIAN CIPTAAN KARYA BATIK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【BAGIAN 1 — IDENTITAS KARYA】
• Judul Ciptaan    : ${data.judul}
• Jenis Ciptaan    : ${data.jenis_ciptaan}
• Nama Pencipta    : ${data.nama_pencipta}

【BAGIAN 2 — DESKRIPSI VISUAL TEKNIS】
• Komposisi Motif Utama : ${data.komposisi_motif_utama}
• Isen-isen (Motif Pengisi) : ${data.isen_isen}
• Kombinasi Warna : ${data.kombinasi_warna}
• Tata Letak : ${data.tata_letak}

【BAGIAN 3 — NILAI TAMBAH & FILOSOFI】
• Makna Filosofis : ${data.makna_filosofis}
• Konteks Budaya : ${data.konteks_budaya}
• Metode Pembuatan : ${data.metode_pembuatan}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

async function generateWithContext({ imageBase64, filosofi, namaPengrajin, observation, references, modelName = GEMINI_MODELS.primary, requestId = "-" }) {
  const started = nowMs();
  const genAI = getGeminiClient();

  const { mimeType, base64Data } = extractImage(imageBase64);
  const prompt = buildGenerationPrompt({ filosofi, namaPengrajin, observation, references });
  const result = await genAI.models.generateContent({
    model: modelName,
    contents: [prompt, { inlineData: { data: base64Data, mimeType } }],
    config: { responseMimeType: "application/json", responseSchema: GENERATION_SCHEMA, temperature: 0.2 },
  });
  const output = JSON.parse(cleanJsonText(result.text));
  logEvent(requestId, "generation_complete", { durationMs: nowMs() - started, references: references.length });
  return formatUraian(output);
}

async function searchKnowledgeBase(observation) {
  const queryText = buildVisualQuery(observation);
  const queryEmbedding = await embedText(queryText);
  const vectorResults = await search(queryEmbedding, RAG_CONFIG.retrievalTopK);
  return selectReferences(rerankReferences(vectorResults, observation));
}

export async function analyzeBatikWithRAG({ imageBase64, filosofi, namaPengrajin, requestId = "-" }) {
  const models = [GEMINI_MODELS.primary, GEMINI_MODELS.fallback];
  let lastError = null;

  for (const modelName of models) {
    try {
      logEvent(requestId, "pipeline_start", { modelName });
      const observation = await analyzeImageVisual(imageBase64, modelName, requestId);
      logEvent(requestId, "retrieval_start", {
        shapeCount: observation.bentuk_pola_utama?.length || 0,
        colorCount: observation.warna_terlihat?.length || 0,
      });

      const references = await searchKnowledgeBase(observation);
      logEvent(requestId, "retrieval_complete", {
        references: references.map(r => ({
          id: r.motif.id,
          similarity: Number(r.similarity.toFixed(4)),
          finalScore: Number(r.finalScore.toFixed(4)),
          matchLevel: r.matchLevel,
        })),
      });

      const uraian = await generateWithContext({
        imageBase64,
        filosofi,
        namaPengrajin,
        observation,
        references,
        modelName,
        requestId,
      });

      const formattedRefs = references.map(r => ({
        nama_motif: r.motif.nama,
        daerah_asal: r.motif.daerah_asal,
        similarity: Math.round(r.similarity * 100),
        finalScore: Math.round(r.finalScore * 100),
        matchLevel: r.matchLevel,
        sumber: sourceString(r.motif.sumber),
      }));

      return {
        uraian,
        references: formattedRefs,
        visualAnalysis: observation,
        modelUsed: modelName,
        ragUsed: true,
        ragMeta: {
          threshold: RAG_CONFIG.minSimilarity,
          maxReferences: RAG_CONFIG.maxReferences,
          reranked: true,
        },
      };
    } catch (error) {
      lastError = error;
      logEvent(requestId, "pipeline_error", { modelName, error: error.message });
      if (isRetryableModelError(error)) continue;
      throw error;
    }
  }

  throw lastError;
}

export async function analyzeBatikDirect({ imageBase64, filosofi, namaPengrajin, requestId = "-" }) {
  const models = [GEMINI_MODELS.primary, GEMINI_MODELS.fallback];
  let lastError = null;

  for (const modelName of models) {
    try {
      const observation = await analyzeImageVisual(imageBase64, modelName, requestId);
      const uraian = await generateWithContext({
        imageBase64,
        filosofi,
        namaPengrajin,
        observation,
        references: [],
        modelName,
        requestId,
      });
      return { uraian, references: [], visualAnalysis: observation, modelUsed: modelName, ragUsed: false };
    } catch (error) {
      lastError = error;
      if (isRetryableModelError(error)) continue;
      throw error;
    }
  }

  throw lastError;
}
