// Password gate – API route for validating the shared password.
// To remove this feature: delete this file, src/middleware.ts, src/app/login/, and APP_PASSWORD from .env.local

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "bib-auth";

function makeToken(password: string): string {
  return createHmac("sha256", password).update("bib-analize-auth").digest("hex");
}

function verifyToken(token: string, password: string): boolean {
  const expected = makeToken(password);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

// POST — validate password and set session cookie
export async function POST(req: NextRequest) {
  const password = process.env.APP_PASSWORD;

  // If no password configured, gate is disabled
  if (!password) {
    return NextResponse.json({ ok: true });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const input = body.password ?? "";

  // Timing-safe comparison
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(password);

  const match =
    inputBuf.length === expectedBuf.length &&
    timingSafeEqual(inputBuf, expectedBuf);

  if (!match) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const token = makeToken(password);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // No maxAge → session cookie (cleared when browser closes)
  });

  return res;
}

// DELETE — logout (clear cookie)
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

// Utility: export for middleware to reuse
export { COOKIE_NAME, makeToken, verifyToken };
