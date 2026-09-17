import { DictionaryResponse } from "../types";

export const lookupWord = async (term: string): Promise<DictionaryResponse> => {
  const response = await fetch("/api/dictionary/lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ term }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Dictionary lookup failed with status ${response.status}`);
  }

  return response.json();
};
