/**
 * Test RAG Semantic Search v2
 * Usage: node scripts/test-rag-search.js "motif diagonal bergelombang seperti ombak"
 */

import { embedText } from "../app/lib/rag/embedding.js";
import { search } from "../app/lib/rag/vector-store.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.log('Usage: node scripts/test-rag-search.js "query text"');
    process.exit(0);
  }

  console.log(`🔍 Query: "${query}"\n`);
  const queryEmbedding = await embedText(query, { cache: false });
  const results = await search(queryEmbedding, 8);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 TOP RESULTS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.motif?.nama || "Unknown"}`);
    console.log(`   Similarity: ${(r.similarity * 100).toFixed(1)}%`);
    console.log(`   Daerah: ${r.motif?.daerah_asal || "-"}`);
    console.log(`   Ciri: ${r.motif?.ciri_visual?.substring(0, 120) || "-"}...`);
    console.log("");
  });
}

main().catch(error => {
  console.error("❌", error.message);
  process.exitCode = 1;
});
