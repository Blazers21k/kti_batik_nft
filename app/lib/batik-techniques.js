export const BATIK_TECHNIQUES = Object.freeze([
  "Batik Printing",
  "Batik Cap",
  "Batik Tulis",
  "Campuran (Cap + Tulis)",
]);

export function isBatikTechnique(value) {
  return BATIK_TECHNIQUES.includes(value);
}
