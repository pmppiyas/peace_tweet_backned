import { DUA_CATEGORY_RULES, FALLBACK_CATEGORY_SLUG } from '../constants/dua-category-rules';

export interface IDuaTextContext {
  title?: string | null;
  meaning?: string | null;
  transliteration?: string | null;
  fadilah?: string | null;
}

export function cleanBengaliText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[।,\.!\?\'\"“”\-–—\(\)\[\]\{\}\/\\:;~_+=*&^%$#@]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function autoCategorizeDua(dua: IDuaTextContext): string {
  const cleanTitle = cleanBengaliText(dua.title || '');
  const cleanMeaning = cleanBengaliText(dua.meaning || '');
  const cleanTransliteration = cleanBengaliText(dua.transliteration || '');
  const cleanFadilah = cleanBengaliText(dua.fadilah || '');

  let bestSlug = FALLBACK_CATEGORY_SLUG;
  let highestScore = 0;

  for (const rule of DUA_CATEGORY_RULES) {
    let score = 0;

    for (const root of rule.roots) {
      const cleanRoot = root.toLowerCase();

      // Title matches (weight: 10)
      if (cleanTitle && cleanTitle.includes(cleanRoot)) {
        score += 10;
      }

      // Meaning matches (weight: 10)
      if (cleanMeaning.includes(cleanRoot)) {
        score += 10;
      }

      // Transliteration matches (weight: 1)
      if (cleanTransliteration.includes(cleanRoot)) {
        score += 1;
      }

      // Fadilah matches (weight: 1)
      if (cleanFadilah && cleanFadilah.includes(cleanRoot)) {
        score += 1;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestSlug = rule.slug;
    }
  }

  return bestSlug;
}
