import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

/** All messages for the moderation queue, newest first, optionally by status. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { eventId } = await params;
  const status = req.nextUrl.searchParams.get("status");
  const valid = ["APPROVED", "PENDING", "HIDDEN", "FLAGGED"];

  const [messages, counts] = await Promise.all([
    prisma.message.findMany({
      where: {
        eventId,
        ...(status && valid.includes(status)
          ? { status: status as "APPROVED" | "PENDING" | "HIDDEN" | "FLAGGED" }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        guestName: true,
        bodyText: true,
        bodyOriginal: true,
        fontId: true,
        locale: true,
        wasAiEnhanced: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.message.groupBy({
      by: ["status"],
      where: { eventId },
      _count: true,
    }),
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  return NextResponse.json({ messages, counts: byStatus });
}
