import { NextRequest, NextResponse } from "next/server";

const WOS_API_BASE = "https://api.clarivate.com/apis/wos-starter/v1";

/**
 * Proxy for the Web of Science Starter API.
 * The Clarivate API does not set CORS headers, so browser-side fetches are blocked.
 * This route forwards the request server-side and returns the JSON response.
 *
 * The API key is read from the server-side environment variable WOS_API_KEY.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const apiKey = process.env.WOS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "WOS_API_KEY não configurada no servidor." },
      { status: 500 },
    );
  }

  // Build upstream URL with all params
  const upstream = new URL(`${WOS_API_BASE}/documents`);
  for (const [key, value] of searchParams.entries()) {
    upstream.searchParams.set(key, value);
  }

  try {
    const resp = await fetch(upstream.toString(), {
      headers: { "X-ApiKey": apiKey },
      signal: AbortSignal.timeout(30_000),
    });

    const body = await resp.text();

    return new NextResponse(body, {
      status: resp.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao consultar WoS API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
