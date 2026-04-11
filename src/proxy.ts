// Password gate – proxy that protects all routes.
// To remove this feature: delete this file, src/app/api/auth/route.ts, src/app/login/, and APP_PASSWORD from .env.local

import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "bib-auth";

// HMAC-SHA256 using Web Crypto API (Edge-compatible)
async function makeToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode("bib-analize-auth"));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;

  // If no password configured, gate is completely disabled
  if (!password) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (token) {
    const expected = await makeToken(password);
    if (token === expected) {
      return NextResponse.next();
    }
  }

  // Not authenticated → redirect to login
  const loginUrl = new URL("/login", req.url);
  // Preserve the original destination so we can redirect back after login
  loginUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Match all routes except: login page, auth API, Next.js internals, static files
    "/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
