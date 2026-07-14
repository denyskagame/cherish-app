/**
 * Accent-insensitive, nickname-aware, typo-tolerant name matching (docs/01 §4).
 * Most seat finders quietly fail on accents, nicknames, typos, and "I searched my
 * spouse's name" — this handles all four so a guest never bounces off their name.
 */

/**
 * Normalize a name for matching: lowercase, strip accents, collapse punctuation +
 * spaces. Stored on `Guest.nameNormalized` and used to build search queries.
 * ("José García" → "jose garcia"; "O'Brien" → "obrien"; "Anne-Marie" → "anne marie".)
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD") // decompose accents: "é" → "e" + combining mark
    .replace(/\p{Diacritic}/gu, "") // remove combining marks
    .toLowerCase()
    .replace(/['’`.]/g, "") // apostrophes / periods → nothing (O'Brien → obrien)
    .replace(/[-_]/g, " ") // hyphens → space
    .replace(/\s+/g, " ")
    .trim();
}

// Bidirectional nickname map, built from a base map expanded both ways so that
// "mike" → "michael" and "michael" → "mike" both resolve.
const BASE: Record<string, string[]> = {
  michael: ["mike", "mikey", "mick"],
  william: ["will", "bill", "billy", "liam"],
  robert: ["rob", "bob", "bobby"],
  james: ["jim", "jimmy", "jamie"],
  elizabeth: ["liz", "beth", "lizzie", "eliza"],
  katherine: ["kate", "katie", "kat", "kathy"],
  thomas: ["tom", "tommy"],
  christopher: ["chris"],
  alexander: ["alex", "xander"],
  alexandra: ["alex", "lexi"],
  samuel: ["sam"],
  samantha: ["sam"],
  daniel: ["dan", "danny"],
  matthew: ["matt"],
  nicholas: ["nick"],
  benjamin: ["ben"],
  joseph: ["joe", "joey"],
  jonathan: ["jon", "jonny"],
  patricia: ["pat", "patty", "trish"],
  patrick: ["pat", "paddy"],
  jennifer: ["jen", "jenny"],
  stephanie: ["steph"],
  stephen: ["steve"],
  steven: ["steve"],
  victoria: ["vicky", "tori"],
  anthony: ["tony"],
  andrew: ["andy", "drew"],
  // Francophone-common (Quebec):
  jean: ["jeannot"],
  francois: ["fran", "franc"],
  genevieve: ["gen"],
  catherine: ["cath", "kat"],
};

const NICK: Record<string, Set<string>> = {};
for (const [full, nicks] of Object.entries(BASE)) {
  NICK[full] = new Set(nicks);
  for (const n of nicks) (NICK[n] ??= new Set()).add(full);
}

function expand(word: string): Set<string> {
  return new Set([word, ...(NICK[word] ?? [])]);
}

/**
 * Terms to prefilter candidates on in SQL. Crucially this expands nicknames
 * ("mike" → ["mike", "michael"]) so that a guest stored as "Michael" is actually
 * fetched — otherwise the nickname scoring never gets a candidate to score, and
 * "mike" would silently find nobody. Words ≤ 1 char are dropped as noise.
 */
export function searchTerms(normalizedQuery: string): string[] {
  const words = normalizedQuery.split(" ").filter((w) => w.length > 1);
  const terms = new Set<string>();
  for (const w of words) for (const v of expand(w)) terms.add(v);
  return [...terms];
}

/** Levenshtein distance, bounded for typo tolerance (returns 99 if far apart). */
function lev(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return d[m][n];
}

/** Score a normalized query against a normalized candidate name. 0..1. */
export function scoreMatch(query: string, candidate: string): number {
  if (query === candidate) return 1;
  if (candidate.includes(query) && query.length >= 3) return 0.95;

  const qWords = query.split(" ");
  const cWords = candidate.split(" ");
  let matched = 0;

  for (const q of qWords) {
    const variants = expand(q);
    const hit = cWords.some((c) =>
      [...variants].some(
        (v) =>
          c === v ||
          c.startsWith(v) ||
          v.startsWith(c) ||
          lev(c, v) <= (v.length > 5 ? 2 : 1),
      ),
    );
    if (hit) matched++;
  }
  return (matched / Math.max(qWords.length, 1)) * 0.85;
}

export const MATCH_THRESHOLD = 0.45;
