import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Resolve the Organization for the current request.
 *
 * Phase 0: path-based (`/{eventSlug}`) — there is one implicit COUPLE org, so we
 * return it directly. The subdomain / custom-domain branches are kept for the
 * Phase 1 shape; `proxy.ts` sets `x-org-slug` / `x-custom-domain` on the request.
 */
export async function resolveOrganization() {
  const h = await headers();
  const orgSlug = h.get("x-org-slug");
  const customDomain = h.get("x-custom-domain");

  if (customDomain) {
    return prisma.organization.findUnique({ where: { customDomain } });
  }
  if (orgSlug) {
    return prisma.organization.findUnique({ where: { slug: orgSlug } });
  }
  // Phase 0: single implicit org.
  return prisma.organization.findFirst({ where: { type: "COUPLE" } });
}
