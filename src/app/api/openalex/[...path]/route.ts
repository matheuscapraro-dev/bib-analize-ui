import { NextRequest, NextResponse } from "next/server";

const OPENALEX_BASE = "https://api.openalex.org";

/**
 * Catch-all proxy for the OpenAlex API.
 *
 * The API key is injected server-side from OPENALEX_API_KEY so it is never
 * exposed to the browser. Any `api_key` param sent by the client is stripped.
 *
 * Usage: /api/openalex/works?filter=...&per_page=25
 *        /api/openalex/autocomplete/institutions?q=utfpr
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const endpoint = path.join("/");

  const upstream = new URL(`${OPENALEX_BASE}/${endpoint}`);

  // Forward all query params except api_key / mailto (we inject our own)
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    if (key === "api_key" || key === "mailto") continue;
    upstream.searchParams.set(key, value);
  }

  // Inject server-side API key or fall back to polite mailto
  const apiKey = process.env.OPENALEX_API_KEY;
  if (apiKey) {
    upstream.searchParams.set("api_key", apiKey);
  } else {
    upstream.searchParams.set("mailto", "bibliometrics@analysis.app");
  }

  try {
    const resp = await fetch(upstream.toString(), {
      signal: AbortSignal.timeout(30_000),
    });

    const body = await resp.text();

    return new NextResponse(body, {
      status: resp.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao consultar OpenAlex API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
