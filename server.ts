import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  function getGeminiClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  function formatErrorMessage(err: any): string {
    if (!err) return "An unexpected error occurred.";
    const msg = err.message || String(err);
    if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
      return "The dictionary service is currently experiencing temporary high demand. Please try again in a few moments.";
    }
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      return "Request rate limit reached. Please wait a few seconds and try again.";
    }
    if (msg.includes("API_KEY") || msg.includes("PERMISSION_DENIED")) {
      return "API key authorization error. Please check your credentials in Settings > Secrets.";
    }
    try {
      const match = msg.match(/\{.*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed?.error?.message) {
          return parsed.error.message;
        }
      }
    } catch {}
    return msg;
  }

  async function generateDictionaryWithFallback(
    ai: GoogleGenAI,
    term: string,
    schema: any
  ) {
    const models = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
    let lastError: any = null;

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `You are a high-precision trilingual dictionary (English, German, Chinese). 
Analyze the term: "${term}". 
Identify the source language. 
Provide comprehensive definitions for the top 1-3 distinct meanings.
Ensure Chinese includes Pinyin. Ensure German nouns include gender (der/die/das).
Provide a practical example sentence translated into all three languages for each meaning.
Return the result strictly as a valid JSON object matching the schema.`,
            config: {
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.1,
            },
          });

          const text = response.text;
          if (!text) {
            throw new Error("The model returned an empty response.");
          }

          let parsed;
          const firstBrace = text.indexOf("{");
          const lastBrace = text.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace !== -1) {
            parsed = JSON.parse(text.substring(firstBrace, lastBrace + 1));
          } else {
            parsed = JSON.parse(text);
          }
          return parsed;
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          const isTransient =
            errMsg.includes("503") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("high demand") ||
            errMsg.includes("429") ||
            errMsg.includes("RESOURCE_EXHAUSTED");

          console.warn(`Attempt ${attempt + 1} with model ${model} failed:`, errMsg);

          if (!isTransient) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/dictionary/lookup", async (req, res) => {
    try {
      const { term } = req.body;
      if (!term || typeof term !== "string" || !term.trim()) {
        return res.status(400).json({ error: "Term is required" });
      }

      const ai = getGeminiClient();

      const dictionarySchema = {
        type: Type.OBJECT,
        properties: {
          detectedLanguage: {
            type: Type.STRING,
            description: "The language of the input term detected by the model (EN, DE, CN, or UNKNOWN).",
          },
          sourceTerm: {
            type: Type.STRING,
            description: "The normalized source term requested.",
          },
          entries: {
            type: Type.ARRAY,
            description: "List of different meanings/definitions for the term.",
            items: {
              type: Type.OBJECT,
              properties: {
                partOfSpeech: { type: Type.STRING, description: "e.g., Noun, Verb, Adjective" },
                definition: { type: Type.STRING, description: "Short definition of this specific meaning." },
                english: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    pronunciation: { type: Type.STRING, nullable: true },
                    context: { type: Type.STRING, nullable: true },
                  },
                  required: ["word"],
                },
                german: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    gender: { type: Type.STRING, nullable: true, description: "der, die, or das if noun" },
                    context: { type: Type.STRING, nullable: true },
                  },
                  required: ["word"],
                },
                chinese: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    pronunciation: { type: Type.STRING, description: "Pinyin with tone marks" },
                    context: { type: Type.STRING, nullable: true },
                  },
                  required: ["word", "pronunciation"],
                },
                example: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING },
                    de: { type: Type.STRING },
                    cn: { type: Type.STRING },
                  },
                  required: ["en", "de", "cn"],
                },
              },
              required: ["partOfSpeech", "definition", "english", "german", "chinese", "example"],
            },
          },
        },
        required: ["detectedLanguage", "sourceTerm", "entries"],
      };

      const result = await generateDictionaryWithFallback(ai, term.trim(), dictionarySchema);
      res.json(result);
    } catch (error: any) {
      console.error("Dictionary lookup error:", error);
      res.status(500).json({ 
        error: formatErrorMessage(error)
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
