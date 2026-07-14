import { prisma } from "@/lib/prisma";

/**
 * Pre-LIVE seating sanity checks (docs/01 §7). Non-fatal warnings the operator
 * sees in the layout editor: a guest seated beyond their table's chair count, or
 * two guests sharing the same (table, seat).
 */
export async function validateSeating(eventId: string): Promise<string[]> {
  const [tables, guests] = await Promise.all([
    prisma.table.findMany({ where: { eventId } }),
    prisma.guest.findMany({
      where: { eventId, tableId: { not: null }, seatNumber: { not: null } },
      include: { table: { select: { number: true, seatsCount: true } } },
    }),
  ]);

  const warnings: string[] = [];

  // Seat overflow.
  for (const g of guests) {
    if (g.table && g.seatNumber! > g.table.seatsCount) {
      warnings.push(
        `${g.fullName}: seat ${g.seatNumber} exceeds Table ${g.table.number}'s ${g.table.seatsCount} seats.`,
      );
    }
  }

  // Seat collisions.
  const seen = new Map<string, string>();
  for (const g of guests) {
    const key = `${g.tableId}:${g.seatNumber}`;
    const prev = seen.get(key);
    if (prev) {
      warnings.push(
        `Table ${g.table?.number}, seat ${g.seatNumber}: ${prev} and ${g.fullName} share a seat.`,
      );
    } else {
      seen.set(key, g.fullName);
    }
  }

  // Reference tables to keep the signature honest even when there are no guests.
  if (tables.length === 0) warnings.push("No tables have been created yet.");

  return warnings;
}
