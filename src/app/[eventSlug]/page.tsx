import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { enUS, fr as frLocale } from "date-fns/locale";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getDictionaries } from "@/lib/i18n";
import { GuestApp } from "@/components/guest/GuestApp";
import { toRoomDrawings } from "@/lib/draw";
import type { EventInfo } from "@/components/guest/types";

// Guest-facing entry point (docs/01). The server loads the event, its tables, and
// both locales' dictionaries up front so the seat finder renders with zero loading
// state and toggling FR↔EN is instant. Lookups themselves go through the uncached
// API so last-minute seat changes appear on the next scan.
export const dynamic = "force-dynamic";

export default async function GuestEventPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
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

  const [tables, features, dictionaries] = await Promise.all([
    prisma.table.findMany({
      where: { eventId: event.id },
      orderBy: { number: "asc" },
    }),
    prisma.venueFeature.findMany({ where: { eventId: event.id } }),
    getDictionaries(event),
  ]);

  const enabled = (
    event.enabledLocales.length ? event.enabledLocales : [event.defaultLocale]
  ).filter((l): l is "en" | "fr" => l === "en" || l === "fr");
  const initialLocale: "en" | "fr" =
    event.defaultLocale === "fr" ? "fr" : "en";

  const dateFor = (loc: "en" | "fr") =>
    formatInTimeZone(
      event.weddingDate,
      event.timezone,
      loc === "fr" ? "EEEE d MMMM yyyy" : "EEEE, MMMM d, yyyy",
      { locale: loc === "fr" ? frLocale : enUS },
    );
  const subtitles = {
    en: `${dateFor("en")} · ${event.venueName}`,
    fr: `${dateFor("fr")} · ${event.venueName}`,
  };
  const weddingDates = { en: dateFor("en"), fr: dateFor("fr") };

  const eventInfo: EventInfo = {
    slug: event.slug,
    coupleNames: event.coupleNames,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    venueLat: event.venueLat,
    venueLng: event.venueLng,
    roomShape: event.roomShape,
    roomWidth: event.roomWidth,
    roomHeight: event.roomHeight,
    tableLabelStyle: event.tableLabelStyle === "name" ? "name" : "number",
    featureSeating: event.featureSeating,
    featureMenu: event.featureMenu,
    featureSchedule: event.featureSchedule,
    featureMessages: event.featureMessages,
  };

  return (
    <GuestApp
      event={eventInfo}
      subtitles={subtitles}
      weddingDates={weddingDates}
      tables={tables}
      features={features}
      drawings={toRoomDrawings(event.roomDrawings)}
      brand={org.brandPrimary}
      initialLocale={initialLocale}
      enabledLocales={enabled.length ? enabled : [initialLocale]}
      dictionaries={dictionaries}
    />
  );
}
