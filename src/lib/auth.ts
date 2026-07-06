import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { UnauthorizedError } from "@/lib/errors";

/**
 * Phase 0 auth: a single admin password gates the whole operator console.
 * A successful login sets a signed (HS256) session cookie. Phase 1 replaces this
 * with Supabase Auth + org roles (docs/00 §4) — guests never authenticate.
 */
const COOKIE_NAME = "cherish_admin";
const SESSION_DAYS = 7;

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.ADMIN_COOKIE_SECRET!);
}

/** Constant-ish check against the configured admin password. */
export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  return expected.length > 0 && password === expected;
}

export async function createAdminSession(): Promise<void> {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

/** Throw UnauthorizedError unless the request carries a valid admin session. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    throw new UnauthorizedError("Admin authentication required");
  }
}
