import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getFont } from "@/lib/fonts";
import { limit } from "@/lib/rate-limit";
import { hashIp } from "@/lib/encrypt";

// Guest message book (docs/03 §4, §7). POST submits a message; GET returns the
// approved book with cursor pagination so hundreds of pages scroll smoothly.
// AI enhancement (§5) and AI moderation triage (§6) are deferred — moderation is
// manual: when the event has moderation on, messages land PENDING for review.
export const dynamic = "force-dynamic";

const Body = z.object({
  guestName: z.string().trim().min(1).max(100),
  text: z.string().trim().min(3).max(600),
  original: z.string().trim().max(600).optional(),
  fontId: z.string(),
  locale: z.enum(["en", "fr"]).default("en"),
  wasAiEnhanced: z.boolean().default(false),
  website: z.string().max(0).optional(), // honeypot — bots fill it, humans can't see it
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const ipH = hashIp(ip);

  const { allowed } = await limit(`msg:${ipH}:${eventSlug}`, 3, 3600);
  if (!allowed)
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  const b = parsed.data;
  // Silently accept-and-drop bots that filled the honeypot.
  if (b.website && b.website.length > 0)
    return NextResponse.json({ ok: true }, { status: 200 });

  const org = await resolveOrganization();
  if (!org) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let event;
  try {
    event = await getEventOr404(org.id, eventSlug);
  } catch (err) {
    if (err instanceof NotFoundError)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    throw err;
  }

  if (!event.featureMessages)
    return NextResponse.json({ error: "closed" }, { status: 403 });

  const font = getFont(b.fontId);
  const status = event.moderateMessages ? "PENDING" : "APPROVED";

  const message = await prisma.message.create({
    data: {
      eventId: event.id,
      guestName: b.guestName,
      bodyText: b.text,
      bodyOriginal: b.original ?? null,
      fontId: font.id,
      locale: b.locale,
      wasAiEnhanced: b.wasAiEnhanced,
      status,
      ipHash: ipH,
    },
    select: {
      id: true,
      guestName: true,
      bodyText: true,
      fontId: true,
      createdAt: true,
      status: true,
    },
  });

  return NextResponse.json(
    { message, moderated: status === "PENDING" },
    { status: 201 },
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const org = await resolveOrganization();
  if (!org)
    return NextResponse.json({ messages: [], nextCursor: null }, { status: 404 });

  let event;
  try {
    event = await getEventOr404(org.id, eventSlug);
  } catch (err) {
    if (err instanceof NotFoundError)
      return NextResponse.json(
        { messages: [], nextCursor: null },
        { status: 404 },
      );
    throw err;
  }

  const cursor = req.nextUrl.searchParams.get("cursor");
  const take = 20;
  const rows = await prisma.message.findMany({
    where: { eventId: event.id, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      guestName: true,
      bodyText: true,
      fontId: true,
      createdAt: true,
    },
  });

  const nextCursor = rows.length > take ? rows[take].id : null;
  return NextResponse.json({ messages: rows.slice(0, take), nextCursor });
}
