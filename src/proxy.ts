import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/cookie-name";

/** Routes reachable without an account. Everything else requires login. */
const PUBLIC_EXACT = new Set(["/", "/login", "/register", "/forgot-password"]);
const PUBLIC_PREFIX = ["/credits", "/terms", "/privacy", "/api/auth/", "/robots", "/sitemap"];

function isPublic(pathname: string) {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIX.some((p) => pathname.startsWith(p));
}

/**
 * Optimistic gate: redirect when there is no session cookie at all. The cookie
 * is *verified* server-side in `requireUser()` on every page and action, so
 * this only avoids rendering protected pages for anonymous visitors.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname) || request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|art/|audio/|favicon.ico).*)"],
};
