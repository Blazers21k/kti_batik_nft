import { readFile } from "fs/promises";
import path from "path";

let knowledgePromise = null;
let knowledgeCache = null;

function dataDir() {
  return path.join(process.cwd(), "app", "data", "batik-knowledge");
}

async function readJson(name) {
  const raw = await readFile(path.join(dataDir(), name), "utf-8");
  return JSON.parse(raw);
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueById(items) {
  return [...new Map(items.map(item => [item.id, item])).values()];
}

function resolveRegions(motif, regions) {
  const byMotifId = regions.filter(region => (region.motif_khas || []).includes(motif.id));
  const originText = normalize(motif.daerah_asal);
  const byText = regions.filter(region => {
    const candidates = [region.nama, region.provinsi, ...(region.sentra_produksi || [])]
      .map(normalize)
      .filter(Boolean);
    return candidates.some(candidate => candidate && originText.includes(candidate));
  });
  return uniqueById([...byMotifId, ...byText]);
}

function resolveTechnique(motif, techniques) {
  const exact = techniques.find(t => t.id === motif.teknik);
  if (exact) return exact;

  if (motif.teknik?.includes("batik_tulis")) {
    return techniques.find(t => t.id === "batik_tulis") || null;
  }

  const motifTechniqueText = normalize(motif.teknik);
  return techniques.find(t => normalize(t.nama).includes(motifTechniqueText)) || null;
}

function resolveColors(motif, colors) {
  const text = normalize((motif.warna_tradisional || []).join(" "));
  return colors.filter(color => {
    const id = normalize(color.id);
    const name = normalize(color.nama);
    return text.includes(id) || text.includes(name.split(" ")[0]);
  });
}

function buildIndexes({ motifs, regions, techniques, colors }) {
  const motifById = new Map(motifs.map(m => [m.id, m]));
  const regionById = new Map(regions.map(r => [r.id, r]));
  const techniqueById = new Map(techniques.map(t => [t.id, t]));
  const colorById = new Map(colors.map(c => [c.id, c]));

  function enrichMotif(motif) {
    const related = (motif.relasi_motif || []).map(id => ({
      id,
      motif: motifById.get(id) || null,
      nama: motifById.get(id)?.nama || id,
      resolved: motifById.has(id),
    }));

    const resolvedRegions = resolveRegions(motif, regions);
    const technique = resolveTechnique(motif, techniques);
    const resolvedColors = resolveColors(motif, colors);

    return {
      motif,
      regions: resolvedRegions,
      technique,
      colors: resolvedColors,
      related,
      sourceCoverage: {
        motif: true,
        daerah: resolvedRegions.length > 0,
        teknik: Boolean(technique),
        warna: resolvedColors.length > 0,
        relasi: related.length > 0,
      },
    };
  }

  return { motifById, regionById, techniqueById, colorById, enrichMotif };
}

export async function loadKnowledgeBase() {
  if (knowledgeCache) return knowledgeCache;
  if (knowledgePromise) return knowledgePromise;

  knowledgePromise = Promise.all([
    readJson("motif-catalog.json"),
    readJson("daerah-batik.json"),
    readJson("teknik-batik.json"),
    readJson("warna-batik.json"),
  ]).then(([motifs, regions, techniques, colors]) => {
    knowledgeCache = {
      motifs,
      regions,
      techniques,
      colors,
      ...buildIndexes({ motifs, regions, techniques, colors }),
    };
    return knowledgeCache;
  }).finally(() => {
    knowledgePromise = null;
  });

  return knowledgePromise;
}

export function resetKnowledgeBaseCache() {
  knowledgeCache = null;
  knowledgePromise = null;
}
