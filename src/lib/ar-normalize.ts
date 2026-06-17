// Normalize Arabic for search: strip diacritics, unify alef/yaa/taa-marbuta, lowercase.
export function normalizeAr(input: string): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u0652\u0670]/g, "") // diacritics
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}