import { NextRequest, NextResponse } from "next/server";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

// Guest schedule read model (docs/02 §7): all items in time order, resolved to
// the guest's locale (EN fallback). Returns the event timezone so the client
// formats every time at the venue, never on the device.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const locale = req.nextUrl.searchParams.get("locale") === "fr" ? "fr" : "en";

  const org = await resolveOrganization();
  if (!org)
    return NextResponse.json({ timezone: "UTC", items: [] }, { status: 404 });

  let event;
  try {
    event = await getEventOr404(org.id, eventSlug);
  } catch (err) {
    if (err instanceof NotFoundError)
      return NextResponse.json({ timezone: "UTC", items: [] }, { status: 404 });
    throw err;
  }

  const items = await prisma.scheduleItem.findMany({
    where: { eventId: event.id },
    orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json(
    {
      timezone: event.timezone,
      items: items.map((i) => ({
        id: i.id,
        startsAt: i.startsAt.toISOString(),
        endsAt: i.endsAt?.toISOString() ?? null,
        title: locale === "fr" && i.titleFr ? i.titleFr : i.title,
        description:
          locale === "fr" && i.descriptionFr ? i.descriptionFr : i.description,
        icon: i.icon,
        location: i.location,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
