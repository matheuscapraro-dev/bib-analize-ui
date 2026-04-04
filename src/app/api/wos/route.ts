import { NextRequest, NextResponse } from "next/server";

const WOS_API_BASE = "https://api.clarivate.com/apis/wos-starter/v1";

/**
 * Proxy for the Web of Science Starter API.
 * The Clarivate API does not set CORS headers, so browser-side fetches are blocked.
 * This route forwards the request server-side and returns the JSON response.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const apiKey = searchParams.get("apiKey");
  if (!apiKey) {
    return NextResponse.json({ error: "API Key é obrigatória." }, { status: 400 });
  }

  // Build upstream URL with all params except apiKey
  const upstream = new URL(`${WOS_API_BASE}/documents`);
  for (const [key, value] of searchParams.entries()) {
    if (key !== "apiKey") {
      upstream.searchParams.set(key, value);
    }
  }

  const resp = await fetch(upstream.toString(), {
    headers: { "X-ApiKey": apiKey },
    signal: AbortSignal.timeout(30_000),
  });

  const body = await resp.text();

  return new NextResponse(body, {
    status: resp.status,
    headers: { "Content-Type": "application/json" },
  });
}
