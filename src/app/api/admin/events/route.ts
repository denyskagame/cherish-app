import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";
import { resolveOrganization } from "@/lib/tenant";
import { uniqueEventSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

const Locale = z.enum(["en", "fr"]);

const Create = z.object({
  coupleNames: z.string().trim().min(1),
  partnerAName: z.string().trim().optional(),
  partnerBName: z.string().trim().optional(),
  // wall-clock "yyyy-MM-ddTHH:mm" in the chosen timezone
  weddingDate: z.string().min(10),
  timezone: z.string().default("America/Toronto"),
  venueName: z.string().trim().min(1),
  venueAddress: z.string().trim().optional(),
  venueLat: z.number().optional(),
  venueLng: z.number().optional(),
  defaultLocale: Locale.default("en"),
  enabledLocales: z.array(Locale).min(1).default(["en"]),
});

/** Create the event for a new wedding (Phase 0: one event per org). */
export async function POST(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const org = await resolveOrganization();
  if (!org)
    return NextResponse.json({ error: "No organization" }, { status: 400 });

  const b = Create.parse(await req.json());
  const weddingDate = fromZonedTime(b.weddingDate, b.timezone);
  const year = Number(b.weddingDate.slice(0, 4)) || new Date().getFullYear();
  const slug = await uniqueEventSlug(org.id, b.coupleNames, year);

  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      slug,
      coupleNames: b.coupleNames,
      partnerAName: b.partnerAName || null,
      partnerBName: b.partnerBName || null,
      weddingDate,
      timezone: b.timezone,
      venueName: b.venueName,
      venueAddress: b.venueAddress || null,
      venueLat: b.venueLat ?? null,
      venueLng: b.venueLng ?? null,
      defaultLocale: b.defaultLocale,
      enabledLocales: b.enabledLocales,
      status: "DRAFT",
    },
    select: { id: true, slug: true },
  });

  return NextResponse.json(event, { status: 201 });
}
