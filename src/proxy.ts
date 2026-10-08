import { NextResponse, type NextRequest } from "next/server";

export const GUEST_COOKIE = "catsino_guest";

/**
 * Assigns a stable guest id cookie so the app is playable without signing in.
 * Middleware is the right place to set cookies — Server Components cannot.
 *
 * The id is set on BOTH the request (so the current render sees it) and the
 * response (so the browser keeps it). Without the request copy, the first
 * render would create a guest with a different id than the cookie.
 */
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(GUEST_COOKIE)?.value;
  const guestId = existing ?? crypto.randomUUID();

  if (!existing) {
    request.cookies.set(GUEST_COOKIE, guestId);
  }

  const response = NextResponse.next({ request });
  if (!existing) {
    response.cookies.set(GUEST_COOKIE, guestId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  // Skip static assets and the API surface.
  matcher: ["/((?!_next/static|_next/image|art/|audio/|favicon.ico).*)"],
};
