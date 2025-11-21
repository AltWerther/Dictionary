import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DictionaryResponse, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const dictionarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    detectedLanguage: {
      type: Type.STRING,
      enum: [Language.EN, Language.DE, Language.CN, Language.UNKNOWN],
      description: "The language of the input term detected by the model.",
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
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a high-precision trilingual dictionary (English, German, Chinese). 
      Analyze the term: "${term}". 
      Identify the source language. 
      Provide comprehensive definitions for the top 1-3 distinct meanings (e.g. if it's 'Bank', include both financial and seating meanings).
      Ensure Chinese includes Pinyin. Ensure German nouns include gender (der/die/das).
      Provide a practical example sentence translated into all three languages for each meaning.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: dictionarySchema,
        temperature: 0.3, // Lower temperature for more deterministic dictionary results
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as DictionaryResponse;
    }
    throw new Error("No response text generated");
  } catch (error) {
    console.error("Dictionary lookup failed:", error);
    throw error;
  }
};

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Transcribe this spoken word or phrase exactly. It is likely in German, English, or Chinese. Return ONLY the transcribed text. Do not add periods, quotes, or explanations. If it is Chinese, return Simplified Chinese characters." }
        ]
      }
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Transcription failed:", error);
    throw error;
  }
};
