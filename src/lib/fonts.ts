// Handwriting font registry for the message book (docs/03 §3). These faces are
// the ONLY non-chrome fonts and are used exclusively for guest messages — the app
// chrome stays on Fraunces + Instrument Sans. All five are preloaded in the root
// layout (docs/08 §B2), so the write textarea and the book render live with no FOUT.
export const HANDWRITING_FONTS = [
  { id: "dancing", label: { en: "Flowing", fr: "Fluide" }, family: "'Dancing Script', cursive", size: 22, weight: 500 },
  { id: "caveat", label: { en: "Casual", fr: "Décontracté" }, family: "'Caveat', cursive", size: 23, weight: 500 },
  { id: "sacramento", label: { en: "Elegant", fr: "Élégant" }, family: "'Sacramento', cursive", size: 26, weight: 400 },
  { id: "great-vibes", label: { en: "Romantic", fr: "Romantique" }, family: "'Great Vibes', cursive", size: 25, weight: 400 },
  { id: "satisfy", label: { en: "Classic", fr: "Classique" }, family: "'Satisfy', cursive", size: 21, weight: 400 },
] as const;

export type FontId = (typeof HANDWRITING_FONTS)[number]["id"];

/** Resolve a font by id, falling back to the first face for unknown/legacy ids. */
export const getFont = (id: string) =>
  HANDWRITING_FONTS.find((f) => f.id === id) ?? HANDWRITING_FONTS[0];
