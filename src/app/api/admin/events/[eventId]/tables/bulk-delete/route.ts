import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

const Body = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

/** Delete many tables at once. Seated guests keep their rows (tableId → null). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId } = await params;
  const { ids, all } = Body.parse(await req.json());

  if (!all && (!ids || ids.length === 0))
    return NextResponse.json({ error: "nothing_selected" }, { status: 400 });

  const result = await prisma.table.deleteMany({
    where: { eventId, ...(all ? {} : { id: { in: ids } }) },
  });

  revalidatePath("/[eventSlug]", "page");
  return NextResponse.json({ deleted: result.count });
}
