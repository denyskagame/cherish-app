import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { MessageModeration } from "@/components/admin/MessageModeration";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
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
    where: { eventId: event.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      guestName: true,
      bodyText: true,
      bodyOriginal: true,
      fontId: true,
      locale: true,
      wasAiEnhanced: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <MessageModeration
      eventId={event.id}
      eventSlug={event.slug}
      initialModerate={event.moderateMessages}
      initialMessages={messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
