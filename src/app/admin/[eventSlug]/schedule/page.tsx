import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ScheduleEditor } from "@/components/admin/ScheduleEditor";

export const dynamic = "force-dynamic";

export default async function ScheduleEditorPage({
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

  const items = await prisma.scheduleItem.findMany({
    where: { eventId: event.id },
    orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <ScheduleEditor
      eventId={event.id}
      timezone={event.timezone}
      weddingDate={event.weddingDate.toISOString()}
      initialItems={items.map((i) => ({
        id: i.id,
        startsAt: i.startsAt.toISOString(),
        endsAt: i.endsAt?.toISOString() ?? null,
        title: i.title,
        titleFr: i.titleFr,
        description: i.description,
        descriptionFr: i.descriptionFr,
        icon: i.icon,
        location: i.location,
      }))}
    />
  );
}
