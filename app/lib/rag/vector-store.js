import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { loadKnowledgeBase } from "./knowledge-store.js";
import { GEMINI_MODELS } from "./gemini-client.js";

let dataPromise = null;
let dataCache = null;

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error("Vector length mismatch");
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf-8"));
}

export async function loadData() {
  if (dataCache) return dataCache;
  if (dataPromise) return dataPromise;

  dataPromise = (async () => {
    const dataDir = path.join(process.cwd(), "app", "data", "batik-knowledge");
    const embeddingsPath = path.join(dataDir, "embeddings-cache.json");

    if (!existsSync(embeddingsPath)) {
      throw new Error("embeddings-cache.json belum ada. Jalankan: npm run rag:build");
    }

    const [rawEmbeddings, knowledge] = await Promise.all([
      readJson(embeddingsPath),
      loadKnowledgeBase(),
    ]);

    const entries = Array.isArray(rawEmbeddings) ? rawEmbeddings : rawEmbeddings.entries;
    const cacheMeta = Array.isArray(rawEmbeddings)
      ? { version: 1, legacy: true, model: "unknown" }
      : {
          version: rawEmbeddings.version || 0,
          legacy: false,
          model: rawEmbeddings.model || "unknown",
          sourceHash: rawEmbeddings.sourceHash,
        };

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error("embeddings-cache.json kosong atau formatnya tidak valid");
    }
    if (cacheMeta.version !== 3 || cacheMeta.model !== GEMINI_MODELS.embedding) {
      throw new Error(`Cache embedding tidak cocok (versi ${cacheMeta.version}, model ${cacheMeta.model}). Jalankan: npm run rag:build`);
    }

    const motifsById = new Map(knowledge.motifs.map(motif => [motif.id, motif]));
    const cacheIds = new Set(entries.map(entry => entry.id));
    const missingIds = knowledge.motifs.filter(motif => !cacheIds.has(motif.id)).map(motif => motif.id);
    const dimensions = new Set(entries.map(entry => Array.isArray(entry.embedding) ? entry.embedding.length : 0));
    if (missingIds.length || entries.length !== knowledge.motifs.length) {
      throw new Error(`Cache Embedding 2 tidak lengkap (${entries.length}/${knowledge.motifs.length}). Jalankan ulang: npm run rag:build`);
    }
    if (dimensions.size !== 1 || dimensions.has(0)) {
      throw new Error("Dimensi vector pada embeddings-cache.json tidak konsisten. Jalankan: npm run rag:build");
    }

    const embeddings = entries.map(entry => ({
      ...entry,
      motif: motifsById.get(entry.id) || null,
      knowledge: motifsById.has(entry.id) ? knowledge.enrichMotif(motifsById.get(entry.id)) : null,
    })).filter(entry => entry.motif && Array.isArray(entry.embedding));

    dataCache = { embeddings, catalog: knowledge.motifs, knowledge, cacheMeta };
    console.log(`Vector store loaded: ${embeddings.length} embeddings, ${knowledge.motifs.length} motifs, KB daerah=${knowledge.regions.length}, teknik=${knowledge.techniques.length}, warna=${knowledge.colors.length}`);
    return dataCache;
  })().finally(() => {
    dataPromise = null;
  });

  return dataPromise;
}

export async function search(queryEmbedding, topK = 8) {
  const { embeddings } = await loadData();
  const expectedDimensions = embeddings[0].embedding.length;
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== expectedDimensions) {
    throw new Error(`Dimensi query embedding tidak cocok (${queryEmbedding?.length || 0} vs ${expectedDimensions})`);
  }

  const results = embeddings.map(entry => ({
    motif: entry.motif,
    knowledge: entry.knowledge,
    similarity: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, Math.max(1, topK));
}

export function resetCache() {
  dataCache = null;
  dataPromise = null;
}
