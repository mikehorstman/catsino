import { NextResponse } from "next/server";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionCookie,
  verifyFreshIdToken,
} from "@/server/auth/firebase";
import { AuthService } from "@/server/services/auth";
import { getStore } from "@/server/store";

export const runtime = "nodejs";

const bodySchema = z.object({
  idToken: z.string().min(20),
  displayName: z.string().max(40).optional(),
});

/** Exchange a Firebase ID token for an httpOnly session cookie + provision the profile. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  try {
    const decoded = await verifyFreshIdToken(parsed.data.idToken);
    if (!decoded.email) {
      return NextResponse.json({ ok: false, error: "Account has no email" }, { status: 400 });
    }

    const { user, created } = await new AuthService(getStore()).provision({
      uid: decoded.uid,
      email: decoded.email,
      displayName: parsed.data.displayName ?? (decoded.name as string | undefined),
      provider: decoded.firebase?.sign_in_provider,
    });

    const cookie = await createSessionCookie(parsed.data.idToken);
    const response = NextResponse.json({ ok: true, created, userId: user.id });
    response.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Authentication failed" }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
