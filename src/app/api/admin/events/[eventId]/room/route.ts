import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

// The room map shell: outer shape + proportions of the room the operator arranges.
const Patch = z.object({
  roomShape: z
    .enum([
      "rounded",
      "double-frame",
      "chapel",
      "bay",
      "octagon",
      "marquee",
    ])
    .optional(),
  roomWidth: z.number().int().min(120).max(1200).optional(),
  roomHeight: z.number().int().min(120).max(1200).optional(),
  roomDrawings: z
    .array(
      z.object({
        id: z.string(),
        points: z.array(z.tuple([z.number(), z.number()])).max(2000),
      }),
    )
    .max(200)
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId } = await params;
  const { roomDrawings, ...rest } = Patch.parse(await req.json());
  const data: Record<string, unknown> = { ...rest };
  if (roomDrawings !== undefined) data.roomDrawings = roomDrawings;
  const result = await prisma.event.updateMany({ where: { id: eventId }, data });
  if (result.count === 0)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { roomShape: true, roomWidth: true, roomHeight: true },
  });
  return NextResponse.json(event);
}
