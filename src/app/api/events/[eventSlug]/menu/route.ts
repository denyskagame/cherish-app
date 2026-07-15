import { NextRequest, NextResponse } from "next/server";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { groupMenuByCourse } from "@/lib/menu";

// Guest menu read model (docs/02 §3): active items only, resolved to the guest's
// locale (EN fallback), grouped by course and ordered by the canonical English
// course key so the menu doesn't re-sort when a guest flips FR↔EN. Cached briefly
// at the edge; an admin edit calls revalidatePath to refresh sooner.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const locale = req.nextUrl.searchParams.get("locale") === "fr" ? "fr" : "en";

  const org = await resolveOrganization();
  if (!org) return NextResponse.json([], { status: 404 });

  let event;
  try {
    event = await getEventOr404(org.id, eventSlug);
  } catch (err) {
    if (err instanceof NotFoundError)
      return NextResponse.json([], { status: 404 });
    throw err;
  }

  const items = await prisma.menuItem.findMany({
    where: { eventId: event.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }],
    select: {
      id: true,
      course: true,
      courseFr: true,
      name: true,
      nameFr: true,
      description: true,
      descriptionFr: true,
    },
  });

  return NextResponse.json(groupMenuByCourse(items, locale), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
