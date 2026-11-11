/**
 * URL slug utilities used for public campaign and business URLs
 * (e.g. /c/luxury-apartments-hyderabad).
 */

const MAX_SLUG_LENGTH = 80

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/['’`]/g, "") // apostrophes join words: "Priya's" → "priyas"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "")
}

/**
 * Yields candidate slugs for a base: "base", "base-2", "base-3", …
 * Callers check availability (DB unique) and take the first free one.
 */
export function* candidateSlugs(base: string): Generator<string> {
  const root = slugify(base)
  const stem = root === "" ? "item" : root
  yield stem
  for (let n = 2; n < 100; n += 1) yield `${stem}-${n}`
}

/** First candidate slug for which `isTaken` returns false. */
export async function uniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  for (const candidate of candidateSlugs(base)) {
    if (!(await isTaken(candidate))) return candidate
  }
  // Practically unreachable; fall back to a timestamped slug.
  return `${slugify(base) || "item"}-${Date.now()}`
}
