import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";
import { normalizeName } from "@/lib/fuzzy-name";

export const dynamic = "force-dynamic";

/** List guests for the editor (optionally filtered to one table). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId } = await params;
  const tableId = req.nextUrl.searchParams.get("tableId");
  const guests = await prisma.guest.findMany({
    where: { eventId, ...(tableId ? { tableId } : {}) },
    orderBy: [{ tableId: "asc" }, { seatNumber: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      tableId: true,
      seatNumber: true,
      groupLabel: true,
      partySize: true,
      email: true,
    },
  });
  return NextResponse.json({ guests });
}

const Create = z.object({
  fullName: z.string().min(1),
  tableId: z.string().nullable().optional(),
  seatNumber: z.number().int().positive().nullable().optional(),
  groupLabel: z.string().nullable().optional(),
});

/** Add a guest (typically to the selected table). Deduped on normalized name. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId } = await params;
  const body = Create.parse(await req.json());
  const fullName = body.fullName.trim();
  const nameNormalized = normalizeName(fullName);
  if (!nameNormalized)
    return NextResponse.json({ error: "empty_name" }, { status: 400 });

  const existing = await prisma.guest.findFirst({
    where: { eventId, nameNormalized },
    select: { id: true },
  });
  if (existing)
    return NextResponse.json({ error: "duplicate_name" }, { status: 409 });

  const guest = await prisma.guest.create({
    data: {
      eventId,
      fullName,
      nameNormalized,
      tableId: body.tableId ?? null,
      seatNumber: body.seatNumber ?? null,
      groupLabel: body.groupLabel ?? null,
    },
    select: {
      id: true,
      fullName: true,
      tableId: true,
      seatNumber: true,
      groupLabel: true,
      partySize: true,
      email: true,
    },
  });
  return NextResponse.json(guest, { status: 201 });
}
