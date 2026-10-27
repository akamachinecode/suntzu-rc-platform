import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Sends visitors without a session cookie to /sign-in before a private page renders. This is only
 * a fast first check: the API verifies the session on every request and is the real gate.
 * Add private sections to `matcher`.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/notes/:path*", "/me/:path*", "/crew/:path*", "/organise/:path*"],
};
