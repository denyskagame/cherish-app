import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";
import { validateSeating } from "@/lib/seating-validation";

export const dynamic = "force-dynamic";

/** List tables (+ optional pre-LIVE validation warnings) for the layout editor. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId } = await params;
  const tables = await prisma.table.findMany({
    where: { eventId },
    orderBy: { number: "asc" },
  });

  if (req.nextUrl.searchParams.get("validate")) {
    const [warnings, unseated] = await Promise.all([
      validateSeating(eventId),
      prisma.guest.count({ where: { eventId, tableId: null } }),
    ]);
    return NextResponse.json({ tables, warnings, unseated });
  }

  return NextResponse.json({ tables });
}

const Create = z.object({
  name: z.string().min(1).optional(),
  nameFr: z.string().optional(),
  seatsCount: z.number().int().min(1).max(20).optional(),
  shape: z.enum(["round", "rectangle"]).optional(),
  orientation: z.enum(["horizontal", "vertical"]).optional(),
  locationHint: z.string().nullable().optional(),
  locationHintFr: z.string().nullable().optional(),
  positionX: z.number().min(0).max(1).optional(),
  positionY: z.number().min(0).max(1).optional(),
});

/** Create a new table with the next available number. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = Create.parse(await req.json().catch(() => ({})));

  const max = await prisma.table.aggregate({
    where: { eventId },
    _max: { number: true },
  });
  const number = (max._max.number ?? 0) + 1;

  const table = await prisma.table.create({
    data: {
      eventId,
      number,
      name: body.name ?? `Table ${number}`,
      nameFr: body.nameFr,
      seatsCount: body.seatsCount,
      shape: body.shape,
      orientation: body.orientation,
      locationHint: body.locationHint ?? undefined,
      positionX: body.positionX,
      positionY: body.positionY,
    },
  });

  return NextResponse.json(table, { status: 201 });
}
