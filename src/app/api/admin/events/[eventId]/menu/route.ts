import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

/** All menu items (including hidden) for the editor, in course+sort order. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId } = await params;
  const items = await prisma.menuItem.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }],
  });
  return NextResponse.json({ items });
}

const Create = z.object({
  course: z.string().trim().min(1),
  courseFr: z.string().trim().nullable().optional(),
  name: z.string().trim().min(1),
  nameFr: z.string().trim().nullable().optional(),
  description: z.string().trim().default(""),
  descriptionFr: z.string().trim().nullable().optional(),
});

/** Add a menu item, appended to the end of the sort order. */
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
  const max = await prisma.menuItem.aggregate({
    where: { eventId },
    _max: { sortOrder: true },
  });

  const item = await prisma.menuItem.create({
    data: {
      eventId,
      course: body.course,
      courseFr: body.courseFr ?? null,
      name: body.name,
      nameFr: body.nameFr ?? null,
      description: body.description,
      descriptionFr: body.descriptionFr ?? null,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/[eventSlug]", "page");
  return NextResponse.json(item, { status: 201 });
}

const Reorder = z.object({
  order: z.array(z.object({ id: z.string(), sortOrder: z.number().int() })),
});

/** Batch-persist a new sort order after drag-to-reorder. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId } = await params;
  const { order } = Reorder.parse(await req.json());

  await prisma.$transaction(
    order.map((o) =>
      prisma.menuItem.updateMany({
        where: { id: o.id, eventId },
        data: { sortOrder: o.sortOrder },
      }),
    ),
  );

  revalidatePath("/[eventSlug]", "page");
  return NextResponse.json({ ok: true });
}
