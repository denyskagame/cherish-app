import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { isAdminAuthenticated } from "@/lib/auth";
import { resolveOrganization } from "@/lib/tenant";
import { getEventOr404 } from "@/lib/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { makeQr } from "@/lib/qr";
import { QrPoster } from "@/components/qr/QrPoster";

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
  return { title: event ? `${event.coupleNames} — Scan card` : "Scan card" };
}

// Standalone, print-ready QR sign for the venue (tables / entrance). Auth-guarded
// but NOT wrapped in the admin shell, so it prints clean. Light ivory + gold.
export default async function QrSignPage({
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

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const guestUrl = `${proto}://${host}/${event.slug}`;
  const { png } = await makeQr(guestUrl);

  return (
    <QrPoster coupleNames={event.coupleNames} png={png} url={guestUrl} />
  );
}
