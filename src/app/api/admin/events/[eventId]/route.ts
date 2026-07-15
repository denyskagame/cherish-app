import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

const Locale = z.enum(["en", "fr"]);

const Patch = z.object({
  coupleNames: z.string().trim().min(1).optional(),
  partnerAName: z.string().trim().nullable().optional(),
  partnerBName: z.string().trim().nullable().optional(),
  weddingDate: z.string().min(10).optional(), // wall-clock in `timezone`
  timezone: z.string().optional(),
  venueName: z.string().trim().min(1).optional(),
  venueAddress: z.string().trim().nullable().optional(),
  venueLat: z.number().nullable().optional(),
  venueLng: z.number().nullable().optional(),
  defaultLocale: Locale.optional(),
  enabledLocales: z.array(Locale).min(1).optional(),
  tableLabelStyle: z.enum(["number", "name"]).optional(),
  status: z.enum(["DRAFT", "LIVE", "ARCHIVED"]).optional(),
  featureSeating: z.boolean().optional(),
  featureMenu: z.boolean().optional(),
  featureSchedule: z.boolean().optional(),
  featureMessages: z.boolean().optional(),
  featurePhotos: z.boolean().optional(),
  featureRsvp: z.boolean().optional(),
  moderateMessages: z.boolean().optional(),
});

/** Update the event's identity, venue, locales, status, and feature toggles. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId } = await params;
  const b = Patch.parse(await req.json());
  const { weddingDate, timezone, ...rest } = b;

  const data: Record<string, unknown> = { ...rest };
  if (timezone !== undefined) data.timezone = timezone;
  if (weddingDate !== undefined) {
    // Interpret the wall-clock time in the effective timezone.
    const tz =
      timezone ??
      (await prisma.event.findUnique({
        where: { id: eventId },
        select: { timezone: true },
      }))?.timezone ??
      "America/Toronto";
    data.weddingDate = fromZonedTime(weddingDate, tz);
  }

  const result = await prisma.event.updateMany({ where: { id: eventId }, data });
  if (result.count === 0)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
