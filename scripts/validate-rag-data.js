import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(path.resolve(__dirname, ".."), "app", "data", "batik-knowledge");

async function readJson(name) {
  return JSON.parse(await readFile(path.join(dataDir, name), "utf-8"));
}

async function main() {
  const motifs = await readJson("motif-catalog.json");
  const regions = await readJson("daerah-batik.json");
  const techniques = await readJson("teknik-batik.json");
  const colors = await readJson("warna-batik.json");
  const cache = await readJson("embeddings-cache.json");

  const motifIds = new Set(motifs.map(m => m.id));
  const missingRelated = [...new Set(motifs.flatMap(m => m.relasi_motif || []).filter(id => !motifIds.has(id)))];
  const techniqueIds = new Set(techniques.map(t => t.id));
  const unsupportedTechniques = [...new Set(motifs.map(m => m.teknik).filter(Boolean).filter(t => !techniqueIds.has(t) && !t.includes("batik_tulis")))];

  const entries = Array.isArray(cache) ? cache : cache.entries;
  const missingEmbeddings = motifs.filter(m => !entries.some(e => e.id === m.id)).map(m => m.id);
  const orphanEmbeddings = entries.filter(e => !motifIds.has(e.id)).map(e => e.id);
  const dimensions = [...new Set(entries.map(e => Array.isArray(e.embedding) ? e.embedding.length : 0))];
  const cacheModelValid = !Array.isArray(cache) && cache.version === 3 && cache.model === "gemini-embedding-2";

  console.log(JSON.stringify({
    motifs: motifs.length,
    daerah: regions.length,
    teknik: techniques.length,
    warna: colors.length,
    embeddings: entries.length,
    cacheVersion: Array.isArray(cache) ? 1 : cache.version,
    cacheModel: Array.isArray(cache) ? "unknown" : cache.model,
    cacheModelValid,
    dimensions,
    missingEmbeddings,
    orphanEmbeddings,
    unsupportedTechniques,
    unresolvedRelations: missingRelated,
  }, null, 2));

  if (!cacheModelValid || dimensions.length !== 1 || dimensions[0] === 0 || missingEmbeddings.length || orphanEmbeddings.length || unsupportedTechniques.length) process.exitCode = 1;
}

main().catch(error => {
  console.error("❌", error.message);
  process.exitCode = 1;
});
