import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";
import { normalizeName } from "@/lib/fuzzy-name";

export const dynamic = "force-dynamic";

const Patch = z.object({
  fullName: z.string().min(1).optional(),
  tableId: z.string().nullable().optional(),
  seatNumber: z.number().int().positive().nullable().optional(),
  groupLabel: z.string().nullable().optional(),
});

/** Update a guest — reassign table/seat, rename, or relabel group. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; guestId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId, guestId } = await params;
  const body = Patch.parse(await req.json());
  const data: Record<string, unknown> = { ...body };
  if (body.fullName !== undefined) {
    data.fullName = body.fullName.trim();
    data.nameNormalized = normalizeName(body.fullName);
  }

  const result = await prisma.guest.updateMany({
    where: { id: guestId, eventId },
    data,
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });

  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: {
      id: true,
      fullName: true,
      tableId: true,
      seatNumber: true,
      groupLabel: true,
    },
  });
  return NextResponse.json(guest);
}

/** Remove a guest from the event. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; guestId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId, guestId } = await params;
  const result = await prisma.guest.deleteMany({
    where: { id: guestId, eventId },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
