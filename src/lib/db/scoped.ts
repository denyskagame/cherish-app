import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { normalizeName } from "@/lib/fuzzy-name";

/**
 * Tenant-scoped data access. The golden rule (docs/00 §1): no query touches a
 * tenant-scoped table without an `eventId` / `organizationId` in the `where`.
 * Features go through these helpers so the scope can't be forgotten.
 */

/** Resolve an event by slug within a known org, or throw NotFoundError. */
export async function getEventOr404(organizationId: string, eventSlug: string) {
  const event = await prisma.event.findUnique({
    where: { organizationId_slug: { organizationId, slug: eventSlug } },
  });
  if (!event) throw new NotFoundError("Event not found");
  return event;
}

/** All guest queries flow through here so `eventId` scope is never dropped. */
export function guestsFor(eventId: string) {
  return {
    /** Accent-insensitive substring search on the normalized name. */
    search: (query: string) =>
      prisma.guest.findMany({
        where: { eventId, nameNormalized: { contains: normalizeName(query) } },
        include: { table: true },
        take: 20,
      }),
    byId: (id: string) => prisma.guest.findFirst({ where: { id, eventId } }),
  };
}
