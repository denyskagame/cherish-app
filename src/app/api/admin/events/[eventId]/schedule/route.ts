import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

/** All schedule items for the editor, in time order. Times are returned as ISO
 *  UTC plus the event timezone so the editor can render wall-clock inputs. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId } = await params;
  const [event, items] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: { timezone: true },
    }),
    prisma.scheduleItem.findMany({
      where: { eventId },
      orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }],
    }),
  ]);
  return NextResponse.json({ timezone: event?.timezone ?? "UTC", items });
}

const Create = z.object({
  startsAt: z.string().min(10), // wall-clock in the event timezone
  endsAt: z.string().min(10).nullable().optional(),
  title: z.string().trim().min(1),
  titleFr: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  descriptionFr: z.string().trim().nullable().optional(),
  icon: z.string().trim().nullable().optional(),
  location: z.string().trim().nullable().optional(),
});

/** Add a schedule item. `startsAt`/`endsAt` are wall-clock in the event tz. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { timezone: true },
  });
  if (!event)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const b = Create.parse(await req.json());
  const tz = event.timezone || "America/Toronto";

  const item = await prisma.scheduleItem.create({
    data: {
      eventId,
      startsAt: fromZonedTime(b.startsAt, tz),
      endsAt: b.endsAt ? fromZonedTime(b.endsAt, tz) : null,
      title: b.title,
      titleFr: b.titleFr ?? null,
      description: b.description ?? null,
      descriptionFr: b.descriptionFr ?? null,
      icon: b.icon ?? null,
      location: b.location ?? null,
    },
  });

  revalidatePath("/[eventSlug]", "page");
  return NextResponse.json(item, { status: 201 });
}
