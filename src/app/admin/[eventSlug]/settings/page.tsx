import { notFound, redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { isAdminAuthenticated } from "@/lib/auth";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { EventSettingsForm } from "@/components/admin/EventSettingsForm";

export const dynamic = "force-dynamic";

export default async function EventSettingsPage({
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

  const weddingDateLocal = formatInTimeZone(
    event.weddingDate,
    event.timezone,
    "yyyy-MM-dd'T'HH:mm",
  );

  return (
    <main className="mx-auto max-w-lg px-5 py-10">
      <header className="mb-6">
        <p className="text-brand text-[11px] font-semibold tracking-[0.22em] uppercase">
          {event.coupleNames}
        </p>
        <h1 className="font-display text-text mt-1.5 text-[32px] leading-none">
          Settings
        </h1>
      </header>
      <EventSettingsForm
        event={{
          id: event.id,
          coupleNames: event.coupleNames,
          partnerAName: event.partnerAName ?? "",
          partnerBName: event.partnerBName ?? "",
          weddingDateLocal,
          timezone: event.timezone,
          venueName: event.venueName,
          venueAddress: event.venueAddress ?? "",
          defaultLocale: event.defaultLocale === "fr" ? "fr" : "en",
          enabledLocales: event.enabledLocales,
          tableLabelStyle: event.tableLabelStyle === "name" ? "name" : "number",
          status: event.status,
          featureSeating: event.featureSeating,
          featureMenu: event.featureMenu,
          featureSchedule: event.featureSchedule,
          featureMessages: event.featureMessages,
          featurePhotos: event.featurePhotos,
          featureRsvp: event.featureRsvp,
        }}
      />
    </main>
  );
}
