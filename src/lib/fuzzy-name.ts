/**
 * Normalize a name for accent-insensitive, case-insensitive matching.
 * "Jose" with an accent becomes "jose"; "  Anne-Marie " becomes "anne-marie".
 * Stored on Guest.nameNormalized and used to build search queries.
 *
 * Phase 0 setup ships only this normalizer. The full fuzzy scoring + nickname map
 * (docs/01) lands with the seat-finder feature.
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // strip accents / combining marks
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
