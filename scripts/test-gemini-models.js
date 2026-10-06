import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { fileURLToPath } from "url";
import path from "path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(projectRoot, ".env.local"), quiet: true });

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tidak ditemukan di environment atau .env.local");

  const client = new GoogleGenAI({ apiKey });
  const failures = [];
  for (const model of ["gemini-3.8-flash", "gemini-3.5-flash-lite"]) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: "Return status=ok.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { status: { type: Type.STRING } },
            required: ["status"],
          },
          temperature: 0,
        },
      });
      const result = JSON.parse(response.text || "{}");
      if (result.status !== "ok") throw new Error("output JSON tidak sesuai harapan");
      console.log(`${model}: structured generation OK`);
    } catch (error) {
      console.error(`${model}: gagal (${error.message})`);
      failures.push(model);
    }
  }

  try {
    const embeddingResponse = await client.models.embedContent({
      model: "gemini-embedding-2",
      contents: "task: search result | query: motif batik geometris berulang",
    });
    const embedding = embeddingResponse.embeddings?.[0]?.values;
    if (!Array.isArray(embedding) || !embedding.length || embedding.some(value => !Number.isFinite(value))) {
      throw new Error("respons tidak berisi vector yang valid");
    }
    console.log(`gemini-embedding-2: embedding OK (${embedding.length}D)`);
  } catch (error) {
    console.error(`gemini-embedding-2: gagal (${error.message})`);
    failures.push("gemini-embedding-2");
  }

  if (failures.length) process.exitCode = 1;
}

main().catch(error => {
  console.error("Smoke test gagal:", error.message);
  process.exitCode = 1;
});
