import { NextResponse, type NextRequest } from "next/server";

// Next.js 16: this file replaces `middleware.ts`; the exported function is `proxy`
// (docs/00 §2, docs/08 §3). Tenant resolution shim.
//
// Phase 0 is path-based (`/{eventSlug}`) so there is nothing to resolve — but we
// keep the subdomain / custom-domain shape for Phase 1. The resolved values are
// forwarded on the REQUEST headers so `resolveOrganization()` can read them via
// `headers()`. Any inbound `x-org-slug` / `x-custom-domain` is stripped first so a
// client can't spoof its tenant.
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "";

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/jobs")) {
    return NextResponse.next();
  }

  let orgSlug: string | null = null;
  let customDomain: string | null = null;

  if (!ROOT || host === ROOT || host === `www.${ROOT}` || host.startsWith("localhost")) {
    orgSlug = null; // Phase 0 path-based; single implicit org
  } else if (host.endsWith(`.${ROOT}`)) {
    orgSlug = host.replace(`.${ROOT}`, ""); // subdomain tenancy (Phase 1)
  } else {
    customDomain = host; // vendor custom domain (Phase 1)
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-org-slug");
  requestHeaders.delete("x-custom-domain");
  if (orgSlug) requestHeaders.set("x-org-slug", orgSlug);
  if (customDomain) requestHeaders.set("x-custom-domain", customDomain);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
