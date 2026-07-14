import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

const Patch = z.object({
  positionX: z.number().min(0).max(1).optional(),
  positionY: z.number().min(0).max(1).optional(),
  number: z.number().int().min(1).max(999).optional(),
  name: z.string().min(1).optional(),
  nameFr: z.string().nullable().optional(),
  seatsCount: z.number().int().min(1).max(20).optional(),
  shape: z.enum(["round", "rectangle"]).optional(),
  orientation: z.enum(["horizontal", "vertical"]).optional(),
  rotation: z.number().optional(),
  locationHint: z.string().nullable().optional(),
  locationHintFr: z.string().nullable().optional(),
});

/** Persist a table edit. Changing `number` to one already in use SWAPS the two
 *  tables' numbers (so "change 12 to 3" trades numbers with the current table 3). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; tableId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId, tableId } = await params;
  const { number, ...rest } = Patch.parse(await req.json());

  const table = await prisma.table.findFirst({ where: { id: tableId, eventId } });
  if (!table)
    return NextResponse.json({ error: "Table not found" }, { status: 404 });

  let swapped: { id: string; number: number } | null = null;

  // Renumber (with swap) if the number is changing.
  if (number != null && number !== table.number) {
    const other = await prisma.table.findFirst({
      where: { eventId, number },
    });
    if (other) {
      // Three-step swap through a temporary number to respect the unique index.
      const max = await prisma.table.aggregate({
        where: { eventId },
        _max: { number: true },
      });
      const temp = (max._max.number ?? 0) + 1000;
      await prisma.$transaction([
        prisma.table.update({ where: { id: table.id }, data: { number: temp } }),
        prisma.table.update({ where: { id: other.id }, data: { number: table.number } }),
        prisma.table.update({ where: { id: table.id }, data: { number, ...rest } }),
      ]);
      swapped = { id: other.id, number: table.number };
    } else {
      await prisma.table.update({ where: { id: table.id }, data: { number, ...rest } });
    }
  } else if (Object.keys(rest).length > 0) {
    await prisma.table.update({ where: { id: table.id }, data: rest });
  }

  const updated = await prisma.table.findUnique({ where: { id: tableId } });
  return NextResponse.json({ table: updated, swapped });
}

/** Delete a table; seated guests keep their row (tableId set null by the FK). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; tableId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId, tableId } = await params;
  const result = await prisma.table.deleteMany({
    where: { id: tableId, eventId },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Table not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
