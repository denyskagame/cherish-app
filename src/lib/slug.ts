import { prisma } from "@/lib/prisma";

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
