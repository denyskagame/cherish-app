import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

const TYPES = [
  "stage",
  "danceFloor",
  "dj",
  "buffet",
  "bar",
  "entrance",
  "custom",
] as const;

/** List the room's landmarks. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const { eventId } = await params;
  const features = await prisma.venueFeature.findMany({ where: { eventId } });
  return NextResponse.json({ features });
}

const Create = z.object({
  type: z.enum(TYPES).default("custom"),
  label: z.string().min(1),
  x: z.number().min(0).max(1).default(0.45),
  y: z.number().min(0).max(1).default(0.45),
  width: z.number().min(0.01).max(1).default(0.12),
  height: z.number().min(0.01).max(1).default(0.08),
});

/** Add a landmark to the room. */
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

  const body = Create.parse(await req.json());
  const feature = await prisma.venueFeature.create({ data: { eventId, ...body } });
  return NextResponse.json(feature, { status: 201 });
}
