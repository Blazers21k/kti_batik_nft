import { GEMINI_MODELS, getGeminiClient } from "./gemini-client.js";

const QUERY_CACHE_MAX = Number(process.env.RAG_QUERY_CACHE_MAX || 64);
const QUERY_CACHE_TTL_MS = Number(process.env.RAG_QUERY_CACHE_TTL_MS || 30 * 60 * 1000);
const queryEmbeddingCache = new Map();

function normalizeText(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

function cacheKey(text) {
  return cryptoDigest(normalizeText(text));
}

function cryptoDigest(text) {
  // Web Crypto tersedia di Node/Next tanpa dependency tambahan.
  // Hash tetap deterministik sehingga query yang sama dapat dipakai ulang.
  const bytes = new TextEncoder().encode(text);
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `${hash >>> 0}:${text.length}`;
}

function rememberQueryEmbedding(key, embedding) {
  const now = Date.now();
  queryEmbeddingCache.set(key, { embedding, createdAt: now });

  while (queryEmbeddingCache.size > QUERY_CACHE_MAX) {
    const firstKey = queryEmbeddingCache.keys().next().value;
    if (firstKey === undefined) break;
    queryEmbeddingCache.delete(firstKey);
  }
}

/**
 * Generate embedding untuk satu teks.
 * Cache query embedding bersifat in-memory dan hanya digunakan untuk query runtime.
 * @param {string} text
 * @param {{cache?: boolean}} options
 * @returns {Promise<number[]>}
 */
export async function embedText(text, options = {}) {
  const normalized = normalizeText(text);
  if (!normalized) throw new Error("Teks embedding kosong");
  const embeddingInput = `task: search result | query: ${normalized}`;

  const useCache = options.cache !== false;
  const key = useCache ? cacheKey(`${GEMINI_MODELS.embedding}:${embeddingInput}`) : null;
  if (key) {
    const cached = queryEmbeddingCache.get(key);
    if (cached && Date.now() - cached.createdAt < QUERY_CACHE_TTL_MS) {
      return cached.embedding;
    }
    if (cached) queryEmbeddingCache.delete(key);
  }

  const result = await getGeminiClient().models.embedContent({
    model: GEMINI_MODELS.embedding,
    contents: embeddingInput,
  });
  const embedding = result.embeddings?.[0]?.values;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error(`${GEMINI_MODELS.embedding} tidak mengembalikan vector embedding`);
  }

  if (key) rememberQueryEmbedding(key, embedding);
  return embedding;
}

export async function embedBatch(texts, delayMs = 200) {
  const embeddings = [];
  for (let i = 0; i < texts.length; i++) {
    const embedding = await embedText(texts[i], { cache: false });
    embeddings.push(embedding);
    if (i < texts.length - 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return embeddings;
}

/**
 * Representasi embedding sengaja memprioritaskan ciri yang dapat diamati.
 * Label VISUAL diulang agar sinyal visual lebih dominan daripada filosofi/sejarah.
 */
export function motifToEmbeddingText(motif, knowledge = {}) {
  const visual = [
    motif.ciri_visual,
    motif.sub_kategori,
    motif.kategori,
    ...(motif.isen_isen || []),
  ].filter(Boolean).join("; ");

  const colors = (motif.warna_tradisional || []).join(", ");
  const technique = knowledge.technique?.nama || motif.teknik || "";
  const regions = (knowledge.regions || []).map(r => r.nama).filter(Boolean).join(", ");
  const related = (knowledge.related || []).map(r => r.nama || r.id).filter(Boolean).join(", ");

  // Visual block diulang dua kali secara sengaja untuk memberi bobot semantik lebih tinggi.
  const parts = [
    `CIRI VISUAL UTAMA: ${visual}`,
    `CIRI VISUAL UTAMA: ${visual}`,
    motif.alias?.length ? `ALIAS MOTIF: ${motif.alias.join(", ")}` : "",
    `WARNA REFERENSI: ${colors}`,
    `ISEN-ISEN: ${(motif.isen_isen || []).join(", ")}`,
    `DAERAH REFERENSI: ${motif.daerah_asal}`,
    regions ? `KNOWLEDGE DAERAH: ${regions}` : "",
    technique ? `TEKNIK REFERENSI: ${technique}` : "",
    related ? `RELASI MOTIF: ${related}` : "",
    `NAMA MOTIF: ${motif.nama}`,
    motif.filosofi ? `FILOSOFI: ${motif.filosofi}` : "",
    motif.konteks_budaya ? `KONTEKS BUDAYA: ${motif.konteks_budaya}` : "",
    motif.sejarah_singkat ? `SEJARAH: ${motif.sejarah_singkat}` : "",
  ];

  return `title: ${motif.nama || "none"} | text: ${parts.filter(Boolean).join(". ")}`;
}

export function clearEmbeddingQueryCache() {
  queryEmbeddingCache.clear();
}
