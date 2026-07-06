import { notFound } from "next/navigation";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";

// Guest-facing entry point. Phase 0 setup renders the couple's name from the DB to
// prove the tenant → event → data path end to end (docs/00 §0 "Done when").
// The full guest app (seat, menu, schedule, book, photos) is built per docs/01–04.
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

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 pb-24 text-center">
      <p className="font-serif text-muted text-lg italic">You are invited to celebrate</p>
      <h1 className="font-script text-brand mt-2 text-[52px] leading-tight">
        {event.coupleNames}
      </h1>
      <div className="my-6 h-px w-40 bg-gradient-to-r from-transparent via-brand to-transparent" />
      <p className="text-muted text-sm">The full guest experience is coming soon ✦</p>
    </main>
  );
}
