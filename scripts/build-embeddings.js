/**
 * Build Embeddings Cache v3 with Gemini Embedding 2.
 * Usage: npm run rag:build
 */

import { constants as fsConstants, existsSync } from "fs";
import { copyFile, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODELS } from "../app/lib/rag/gemini-client.js";
import { motifToEmbeddingText } from "../app/lib/rag/embedding.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const dataDir = path.join(projectRoot, "app", "data", "batik-knowledge");
const cachePath = path.join(dataDir, "embeddings-cache.json");
const modelName = GEMINI_MODELS.embedding;
const version = 3;

dotenv.config({ path: path.join(projectRoot, ".env.local"), quiet: true });

async function readJson(name) {
  return JSON.parse(await readFile(path.join(dataDir, name), "utf-8"));
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function resolveKnowledge(catalog, regions, techniques, colors) {
  const motifById = new Map(catalog.map(m => [m.id, m]));

  return catalog.map(motif => {
    const regionMatches = regions.filter(r =>
      (r.motif_khas || []).includes(motif.id) ||
      normalize(motif.daerah_asal).includes(normalize(r.nama)) ||
      normalize(motif.daerah_asal).includes(normalize(r.provinsi))
    );

    const technique = techniques.find(t => t.id === motif.teknik)
      || (motif.teknik?.includes("batik_tulis") ? techniques.find(t => t.id === "batik_tulis") : null);

    const colorMatches = colors.filter(c => {
      const text = normalize((motif.warna_tradisional || []).join(" "));
      return text.includes(normalize(c.id)) || text.includes(normalize(c.nama).split(" ")[0]);
    });

    const related = (motif.relasi_motif || []).map(id => ({
      id,
      nama: motifById.get(id)?.nama || id,
    }));

    return { motif, knowledge: { regions: regionMatches, technique, colors: colorMatches, related } };
  });
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY tidak ditemukan di environment atau .env.local");
  }

  console.log(`Build Embeddings Cache v${version} (${modelName})`);
  const [catalog, regions, techniques, colors] = await Promise.all([
    readJson("motif-catalog.json"),
    readJson("daerah-batik.json"),
    readJson("teknik-batik.json"),
    readJson("warna-batik.json"),
  ]);

  const enriched = resolveKnowledge(catalog, regions, techniques, colors);
  const sourceText = JSON.stringify({ catalog, regions, techniques, colors });
  const sourceHash = crypto.createHash("sha256").update(sourceText).digest("hex");
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const entries = [];
  const errors = [];

  for (let i = 0; i < enriched.length; i++) {
    const { motif, knowledge } = enriched[i];
    const text = motifToEmbeddingText(motif, knowledge);

    try {
      const result = await client.models.embedContent({ model: modelName, contents: text });
      const embedding = result.embeddings?.[0]?.values;
      if (!Array.isArray(embedding) || !embedding.length || embedding.some(value => !Number.isFinite(value))) {
        throw new Error("Respons model tidak berisi vector embedding yang valid");
      }
      if (entries.length && embedding.length !== entries[0].embedding.length) {
        throw new Error(`Dimensi embedding berubah (${embedding.length} vs ${entries[0].embedding.length})`);
      }

      entries.push({ id: motif.id, embedding });
      console.log(`OK [${i + 1}/${enriched.length}] ${motif.nama} (${embedding.length}D)`);
    } catch (error) {
      console.error(`GAGAL [${i + 1}/${enriched.length}] ${motif.nama}: ${error.message}`);
      errors.push({ id: motif.id, nama: motif.nama, error: error.message });
    }

    if (i < enriched.length - 1) await new Promise(resolve => setTimeout(resolve, 250));
  }

  if (errors.length || entries.length !== enriched.length) {
    throw new Error(`Cache lama dipertahankan: hanya ${entries.length}/${enriched.length} embedding berhasil dibuat.`);
  }

  const dimensions = entries[0]?.embedding.length || 0;
  const payload = {
    version,
    model: modelName,
    sourceHash,
    generatedAt: new Date().toISOString(),
    dimensions,
    entries,
  };

  const tempPath = `${cachePath}.${process.pid}.tmp`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(dataDir, `embeddings-cache.before-${modelName}-${timestamp}.json`);
  await writeFile(tempPath, JSON.stringify(payload, null, 2), "utf-8");

  if (existsSync(cachePath)) {
    await copyFile(cachePath, backupPath, fsConstants.COPYFILE_EXCL);
    console.log(`Cache sebelumnya dicadangkan: ${backupPath}`);
  }

  await rename(tempPath, cachePath);
  console.log(`Cache baru tersimpan: ${entries.length}/${enriched.length} embedding ke ${cachePath}`);
}

main().catch(error => {
  console.error("GAGAL", error.message);
  process.exitCode = 1;
});
