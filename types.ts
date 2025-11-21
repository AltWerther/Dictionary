export enum Language {
  EN = 'EN',
  DE = 'DE',
  CN = 'CN',
  UNKNOWN = 'UNKNOWN'
}

export interface TranslationSet {
  word: string;
  pronunciation?: string; // Pinyin for Chinese, IPA for others if available
  gender?: string; // For German (der, die, das)
  context?: string; // nuances, e.g., "financial", "furniture"
}

export interface DictionaryEntry {
  partOfSpeech: string;
  definition: string; // A generic definition in English or the source language
  english: TranslationSet;
  german: TranslationSet;
  chinese: TranslationSet;
  example: {
    en: string;
    de: string;
    cn: string;
  };
}

export interface DictionaryResponse {
  detectedLanguage: Language;
  sourceTerm: string;
  entries: DictionaryEntry[];
}
