import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { MenuEditor } from "@/components/admin/MenuEditor";

export const dynamic = "force-dynamic";

export default async function MenuEditorPage({
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

  const items = await prisma.menuItem.findMany({
    where: { eventId: event.id },
    orderBy: [{ sortOrder: "asc" }],
  });

  return <MenuEditor eventId={event.id} initialItems={items} />;
}
