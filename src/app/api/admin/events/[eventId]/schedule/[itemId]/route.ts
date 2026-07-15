import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

const Patch = z.object({
  startsAt: z.string().min(10).optional(), // wall-clock in the event tz
  endsAt: z.string().min(10).nullable().optional(),
  title: z.string().trim().min(1).optional(),
  titleFr: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  descriptionFr: z.string().trim().nullable().optional(),
  icon: z.string().trim().nullable().optional(),
  location: z.string().trim().nullable().optional(),
});

/** Edit a schedule item. Time fields are wall-clock in the event timezone. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId, itemId } = await params;
  const { startsAt, endsAt, ...rest } = Patch.parse(await req.json());

  const existing = await prisma.scheduleItem.findFirst({
    where: { id: itemId, eventId },
  });
  if (!existing)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { timezone: true },
  });
  const tz = event?.timezone || "America/Toronto";

  const data: Record<string, unknown> = { ...rest };
  if (startsAt !== undefined) data.startsAt = fromZonedTime(startsAt, tz);
  if (endsAt !== undefined)
    data.endsAt = endsAt ? fromZonedTime(endsAt, tz) : null;

  const item = await prisma.scheduleItem.update({
    where: { id: itemId },
    data,
  });

  revalidatePath("/[eventSlug]", "page");
  return NextResponse.json(item);
}

/** Remove a schedule item. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId, itemId } = await params;
  const result = await prisma.scheduleItem.deleteMany({
    where: { id: itemId, eventId },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  revalidatePath("/[eventSlug]", "page");
  return NextResponse.json({ ok: true });
}
