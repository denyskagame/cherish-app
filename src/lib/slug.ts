import { prisma } from "@/lib/prisma";

/** Normalize free text into a URL-safe slug (lowercase, ascii, hyphenated). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** True if `slug` is free to use in this org (optionally excluding one event). */
export async function isSlugAvailable(
  organizationId: string,
  slug: string,
  exceptEventId?: string,
): Promise<boolean> {
  const existing = await prisma.event.findFirst({
    where: {
      organizationId,
      slug,
      ...(exceptEventId ? { NOT: { id: exceptEventId } } : {}),
    },
    select: { id: true },
  });
  return !existing;
}

/** "Aline & Norbert" + 2026 → "aline-norbert-2026", unique within the org. */
export async function uniqueEventSlug(
  organizationId: string,
  coupleNames: string,
  year: number,
): Promise<string> {
  const base =
    coupleNames
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) + `-${year}`;

  let slug = base;
  let n = 2;
  while (
    await prisma.event.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
      select: { id: true },
    })
  ) {
    slug = `${base}-${n++}`;
  }
  return slug;
}
