import { isAdminAuthenticated } from "@/lib/auth";
import { resolveOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

// Wraps authenticated admin pages in the console shell. The login page renders
// bare (no shell) when signed out.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) return <>{children}</>;

  const org = await resolveOrganization();
  const event = org
    ? await prisma.event.findFirst({
        where: { organizationId: org.id },
        orderBy: { createdAt: "asc" },
        select: { slug: true },
      })
    : null;

  return <AdminShell eventSlug={event?.slug ?? null}>{children}</AdminShell>;
}
