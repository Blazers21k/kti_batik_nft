import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { analyzeBatikWithRAG } from "../app/lib/rag/pipeline.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(projectRoot, ".env.local"), quiet: true });

async function main() {
  const imagePath = path.join(projectRoot, "public", "batik-fattah.jpg");
  const imageBase64 = `data:image/jpeg;base64,${(await readFile(imagePath)).toString("base64")}`;
  const result = await analyzeBatikWithRAG({
    imageBase64,
    filosofi: "Uji integrasi lokal untuk analisis batik.",
    namaPengrajin: "Pengrajin Uji",
    requestId: "rag-integration-test",
  });

  console.log(JSON.stringify({
    modelUsed: result.modelUsed,
    ragUsed: result.ragUsed,
    references: result.references.map(reference => reference.nama_motif),
    generatedDescription: Boolean(result.uraian),
    visualAnalysis: result.visualAnalysis,
  }, null, 2));

  if (!result.uraian || !result.ragUsed) throw new Error("Analisis tidak menyelesaikan alur RAG");
}

main().catch(error => {
  console.error("Uji integrasi RAG gagal:", error.message);
  process.exitCode = 1;
});
