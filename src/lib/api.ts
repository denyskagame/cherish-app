import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";

/**
 * Guard an admin API route. Returns a 401 `NextResponse` when the admin session
 * is missing, or `null` when authorized:
 *
 *   const denied = await guardAdmin();
 *   if (denied) return denied;
 */
export async function guardAdmin(): Promise<NextResponse | null> {
  try {
    await requireAdmin();
    return null;
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw err;
  }
}
