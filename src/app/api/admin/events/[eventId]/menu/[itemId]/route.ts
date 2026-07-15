import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

const Patch = z.object({
  course: z.string().trim().min(1).optional(),
  courseFr: z.string().trim().nullable().optional(),
  name: z.string().trim().min(1).optional(),
  nameFr: z.string().trim().nullable().optional(),
  description: z.string().trim().optional(),
  descriptionFr: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
});

/** Edit a menu item (rename, re-course, translate, hide/show). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId, itemId } = await params;
  const data = Patch.parse(await req.json());

  const result = await prisma.menuItem.updateMany({
    where: { id: itemId, eventId },
    data,
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
  revalidatePath("/[eventSlug]", "page");
  return NextResponse.json(item);
}

/** Remove a menu item. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId, itemId } = await params;
  const result = await prisma.menuItem.deleteMany({
    where: { id: itemId, eventId },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  revalidatePath("/[eventSlug]", "page");
  return NextResponse.json({ ok: true });
}
