import { NextRequest, NextResponse } from "next/server";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  normalizeName,
  scoreMatch,
  searchTerms,
  MATCH_THRESHOLD,
} from "@/lib/fuzzy-name";
import { limit } from "@/lib/rate-limit";
import { hashIp } from "@/lib/encrypt";

// Uncached by default (route handlers are dynamic), so a last-minute admin seat
// change is reflected on the very next scan (docs/01 §9). This endpoint never
// returns the guest list — only the single matched guest — so it can't be scraped.
export const dynamic = "force-dynamic";

/** First+last initials for the seatmate ring (full names don't fit in a dot). */
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Shape one matched guest into the pass-card + room-map + zoom payload. */
function toSeat(g: {
  id: string;
  fullName: string;
  seatNumber: number | null;
  groupLabel: string | null;
  table: {
    number: number;
    name: string;
    nameFr: string | null;
    shape: string;
    orientation: string;
    locationHint: string | null;
    locationHintFr: string | null;
    seatLayout: unknown;
    guests: { fullName: string; seatNumber: number | null }[];
  } | null;
}) {
  // Full roster of the guest's OWN table (privacy-safe — it's their table) for the zoom.
  const seatmates = (g.table?.guests ?? [])
    .map((m) => ({
      seatNumber: m.seatNumber,
      name: m.fullName,
      initials: initials(m.fullName),
      isYou: m.fullName === g.fullName,
    }))
    .sort((a, b) => (a.seatNumber ?? 99) - (b.seatNumber ?? 99));
  return {
    id: g.id,
    name: g.fullName,
    tableNumber: g.table?.number ?? null,
    tableName: g.table?.name ?? null,
    tableNameFr: g.table?.nameFr ?? null,
    seatNumber: g.seatNumber,
    groupLabel: g.groupLabel,
    locationHint: g.table?.locationHint ?? null,
    locationHintFr: g.table?.locationHintFr ?? null,
    tableShape: (g.table?.shape ?? "round") as "round" | "rectangle",
    tableOrientation: (g.table?.orientation ?? "horizontal") as
      | "horizontal"
      | "vertical",
    seatLayout: Array.isArray(g.table?.seatLayout) ? g.table.seatLayout : null,
    seatmates,
  };
}

const tableInclude = {
  table: {
    include: { guests: { select: { fullName: true, seatNumber: true } } },
  },
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  const q = sp.get("q")?.trim() ?? "";

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { allowed } = await limit(`seat:${hashIp(ip)}:${eventSlug}`, 30, 60);
  if (!allowed)
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

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

  // Disambiguation follow-up: the guest picked one of the offered options by id.
  if (id) {
    const g = await prisma.guest.findFirst({
      where: { id, eventId: event.id },
      include: tableInclude,
    });
    if (!g) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, guest: toSeat(g) });
  }

  if (q.length < 2)
    return NextResponse.json({ error: "too_short" }, { status: 400 });

  const normalized = normalizeName(q);
  // Expand nicknames into the SQL prefilter so a guest stored under their formal
  // name ("Michael") is fetched when the guest types a nickname ("mike").
  const terms = searchTerms(normalized);
  if (terms.length === 0) return NextResponse.json({ found: false });

  const candidates = await prisma.guest.findMany({
    where: {
      eventId: event.id,
      OR: terms.map((w) => ({ nameNormalized: { contains: w } })),
    },
    include: tableInclude,
    take: 25,
  });

  const scored = candidates
    .map((g) => ({ g, score: scoreMatch(normalized, g.nameNormalized) }))
    .filter((x) => x.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return NextResponse.json({ found: false });

  // Ambiguous: top two within 0.1 of each other → ask instead of guessing.
  if (scored.length > 1 && scored[0].score - scored[1].score < 0.1) {
    return NextResponse.json({
      found: "ambiguous",
      options: scored.slice(0, 4).map(({ g }) => ({
        id: g.id,
        name: g.fullName,
        tableNumber: g.table?.number ?? null,
        tableName: g.table?.name ?? null,
      })),
    });
  }

  return NextResponse.json({ found: true, guest: toSeat(scored[0].g) });
}
