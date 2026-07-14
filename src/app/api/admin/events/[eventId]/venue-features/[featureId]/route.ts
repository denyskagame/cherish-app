import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

const Patch = z.object({
  type: z
    .enum(["stage", "danceFloor", "dj", "buffet", "bar", "entrance", "custom"])
    .optional(),
  label: z.string().min(1).optional(),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  width: z.number().min(0.01).max(1).optional(),
  height: z.number().min(0.01).max(1).optional(),
  rotation: z.number().optional(),
});

/** Move / resize / relabel a landmark. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; featureId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const { eventId, featureId } = await params;
  const data = Patch.parse(await req.json());
  const result = await prisma.venueFeature.updateMany({
    where: { id: featureId, eventId },
    data,
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const feature = await prisma.venueFeature.findUnique({
    where: { id: featureId },
  });
  return NextResponse.json(feature);
}

/** Remove a landmark. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; featureId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const { eventId, featureId } = await params;
  const result = await prisma.venueFeature.deleteMany({
    where: { id: featureId, eventId },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
