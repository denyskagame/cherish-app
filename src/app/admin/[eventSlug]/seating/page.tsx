import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { validateSeating } from "@/lib/seating-validation";
import { TableEditor, type RoomDrawing } from "@/components/admin/TableEditor";

export const dynamic = "force-dynamic";

export default async function SeatingEditorPage({
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

  const [tables, guests, features, warnings] = await Promise.all([
    prisma.table.findMany({
      where: { eventId: event.id },
      orderBy: { number: "asc" },
    }),
    prisma.guest.findMany({
      where: { eventId: event.id },
      orderBy: [{ seatNumber: "asc" }, { fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        tableId: true,
        seatNumber: true,
        groupLabel: true,
      },
    }),
    prisma.venueFeature.findMany({ where: { eventId: event.id } }),
    validateSeating(event.id),
  ]);

  return (
    <main className="px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <TableEditor
          eventId={event.id}
          eventSlug={event.slug}
          coupleNames={event.coupleNames}
          initialLocale={event.defaultLocale === "fr" ? "fr" : "en"}
          initialTables={tables}
          initialGuests={guests}
          initialFeatures={features}
          initialRoom={{
            shape: event.roomShape,
            width: event.roomWidth,
            height: event.roomHeight,
          }}
          initialWarnings={warnings}
          initialDrawings={
            Array.isArray(event.roomDrawings)
              ? (event.roomDrawings as unknown as RoomDrawing[])
              : []
          }
          labelStyle={event.tableLabelStyle === "name" ? "name" : "number"}
        />
      </div>
    </main>
  );
}
