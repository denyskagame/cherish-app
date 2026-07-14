import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";
import { normalizeName } from "@/lib/fuzzy-name";

// Idempotent guest-list import (docs/01 §3). Re-uploading a corrected CSV updates
// rather than duplicates, matched on (eventId, nameNormalized); tables are
// auto-created via upsert. Tolerant of real-world files: BOM, quoted commas,
// "Last, First" order, trailing spaces, mixed-case / spaced headers, empty cells.
export const dynamic = "force-dynamic";

// Empty CSV cells arrive as "" — treat as absent so optional/typed fields don't
// choke (e.g. an empty table_number must be "no table", not a validation error).
const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);

const Row = z.object({
  full_name: z.string().min(1),
  table_number: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().positive().optional(),
  ),
  seat_number: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().positive().optional(),
  ),
  group_label: z.preprocess(emptyToUndef, z.string().optional()),
  party_size: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().positive().default(1),
  ),
  email: z.preprocess(emptyToUndef, z.string().email().optional()),
});

/** Reorder "Last, First" → "First Last" (common in exported guest lists). */
function unflipName(raw: string): string {
  const t = raw.trim();
  if (t.includes(",")) {
    const [last, first] = t.split(",").map((s) => s.trim());
    if (first && last) return `${first} ${last}`;
  }
  return t;
}

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

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const text = (await file.text()).replace(/^﻿/, ""); // strip BOM

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  const summary = { created: 0, updated: 0, errors: [] as string[] };

  for (const [i, raw] of parsed.data.entries()) {
    const result = Row.safeParse(raw);
    if (!result.success) {
      summary.errors.push(`Row ${i + 2}: ${result.error.issues[0].message}`);
      continue;
    }
    const row = result.data;
    const fullName = unflipName(row.full_name);
    const nameNormalized = normalizeName(fullName);
    if (!nameNormalized) {
      summary.errors.push(`Row ${i + 2}: name is empty after trimming`);
      continue;
    }

    // Ensure the referenced table exists (auto-created, idempotently).
    let tableId: string | undefined;
    if (row.table_number) {
      const table = await prisma.table.upsert({
        where: { eventId_number: { eventId, number: row.table_number } },
        create: {
          eventId,
          number: row.table_number,
          name: `Table ${row.table_number}`,
        },
        update: {},
      });
      tableId = table.id;
    }

    const data = {
      fullName,
      nameNormalized,
      tableId,
      seatNumber: row.seat_number ?? null,
      groupLabel: row.group_label ?? null,
      partySize: row.party_size,
      email: row.email ?? null,
    };

    const existing = await prisma.guest.findFirst({
      where: { eventId, nameNormalized },
    });
    if (existing) {
      await prisma.guest.update({ where: { id: existing.id }, data });
      summary.updated++;
    } else {
      await prisma.guest.create({ data: { eventId, ...data } });
      summary.created++;
    }
  }

  return NextResponse.json(summary);
}
