import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { GuestsManager } from "@/components/admin/GuestsManager";

export const dynamic = "force-dynamic";

export default async function GuestsPage({
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

  const [guests, tables] = await Promise.all([
    prisma.guest.findMany({
      where: { eventId: event.id },
      orderBy: [{ tableId: "asc" }, { seatNumber: "asc" }, { fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        tableId: true,
        seatNumber: true,
        groupLabel: true,
        partySize: true,
        email: true,
      },
    }),
    prisma.table.findMany({
      where: { eventId: event.id },
      orderBy: { number: "asc" },
      select: { id: true, number: true, name: true },
    }),
  ]);

  return (
    <GuestsManager
      eventId={event.id}
      initialGuests={guests}
      initialTables={tables}
      labelStyle={event.tableLabelStyle === "name" ? "name" : "number"}
    />
  );
}
