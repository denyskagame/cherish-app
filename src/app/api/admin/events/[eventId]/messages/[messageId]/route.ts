import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

const Patch = z.object({
  status: z.enum(["APPROVED", "PENDING", "HIDDEN", "FLAGGED"]),
});

/** Moderate a message: approve, hide (soft), flag, or requeue. Audited. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; messageId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId, messageId } = await params;
  const { status } = Patch.parse(await req.json());

  const result = await prisma.message.updateMany({
    where: { id: messageId, eventId },
    data: { status },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Message not found" }, { status: 404 });

  await prisma.auditLog.create({
    data: {
      eventId,
      actorType: "operator",
      action: `message.${status.toLowerCase()}`,
      metadata: { messageId },
    },
  });

  revalidatePath("/[eventSlug]", "page");
  return NextResponse.json({ ok: true });
}

/** Permanently delete a message (hard delete). Audited. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; messageId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId, messageId } = await params;
  const result = await prisma.message.deleteMany({
    where: { id: messageId, eventId },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Message not found" }, { status: 404 });

  await prisma.auditLog.create({
    data: {
      eventId,
      actorType: "operator",
      action: "message.delete",
      metadata: { messageId },
    },
  });

  revalidatePath("/[eventSlug]", "page");
  return NextResponse.json({ ok: true });
}
