import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { enUS, fr as frLocale } from "date-fns/locale";
import { isAdminAuthenticated } from "@/lib/auth";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { KeepsakeBook } from "@/components/keepsake/KeepsakeBook";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}): Promise<Metadata> {
  const { eventSlug } = await params;
  const org = await resolveOrganization();
  const event = org
    ? await prisma.event.findFirst({
        where: { organizationId: org.id, slug: eventSlug },
        select: { coupleNames: true },
      })
    : null;
  return { title: event ? `${event.coupleNames} — Message Book` : "Message Book" };
}

// A standalone, print-optimized keepsake (docs/03 §10). Auth-guarded but NOT
// wrapped in the admin shell, so it prints clean. Deliberately a LIGHT, ivory-and-
// gold book — dark screen pages print badly; ink on paper is the keepsake.
export default async function KeepsakePage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const { eventSlug } = await params;
  const org = await resolveOrganization();
  if (!org) notFound();

  let event;
  try {
    event = await getEventOr404(org.id, eventSlug);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const messages = await prisma.message.findMany({
    where: { eventId: event.id, status: "APPROVED" },
    orderBy: { createdAt: "asc" }, // chronological — the book fills as the night went
    select: { id: true, guestName: true, bodyText: true, fontId: true },
  });

  const dateLabel = formatInTimeZone(
    event.weddingDate,
    event.timezone,
    event.defaultLocale === "fr" ? "d MMMM yyyy" : "MMMM d, yyyy",
    { locale: event.defaultLocale === "fr" ? frLocale : enUS },
  );

  return (
    <KeepsakeBook
      eventSlug={event.slug}
      coupleNames={event.coupleNames}
      dateLabel={dateLabel}
      venueName={event.venueName}
      messages={messages}
    />
  );
}
