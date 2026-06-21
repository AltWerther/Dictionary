import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DictionaryResponse } from "../types";

const dictionarySchema: Schema = {
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

export const lookupWord = async (term: string): Promise<DictionaryResponse> => {
  // Creating a new instance per call ensures we always use the latest environment state
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a high-precision trilingual dictionary (English, German, Chinese). 
      Analyze the term: "${term}". 
      Identify the source language. 
      Provide comprehensive definitions for the top 1-3 distinct meanings.
      Ensure Chinese includes Pinyin. Ensure German nouns include gender (der/die/das).
      Provide a practical example sentence translated into all three languages for each meaning.
      Return the result strictly as a valid JSON object matching the schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: dictionarySchema,
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("The model returned an empty response.");
    }

    // Robust JSON extraction in case the model adds preamble text
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      const jsonString = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(jsonString) as DictionaryResponse;
    }
    
    return JSON.parse(text) as DictionaryResponse;
  } catch (error) {
    console.error("Dictionary lookup failed:", error);
    throw error;
  }
};

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Transcribe this spoken word or phrase exactly. It is likely in German, English, or Chinese. Return ONLY the transcribed text. Do not add punctuation or commentary. Use Simplified Chinese for Chinese characters." }
        ]
      }
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Transcription failed:", error);
    throw error;
  }
};