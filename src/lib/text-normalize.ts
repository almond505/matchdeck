const SYNONYMS: Record<string, string> = {
  kfc: "fried chicken",
  "ไก่ทอด": "fried chicken",
  sushi: "japanese food",
  ramen: "japanese food",
  tokyo: "japan",
  osaka: "japan",
  "nyc": "new york",
};

export function normalizeAnswer(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return SYNONYMS[normalized] ?? normalized;
}
