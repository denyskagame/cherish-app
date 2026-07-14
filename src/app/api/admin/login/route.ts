import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminPassword,
  createAdminSession,
  clearAdminSession,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Phase-0 admin login: a single password sets a signed session cookie. */
export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !verifyAdminPassword(password)) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }
  await createAdminSession();
  return NextResponse.json({ ok: true });
}

/** Log out. */
export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
