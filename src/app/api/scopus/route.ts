import { NextRequest, NextResponse } from "next/server";

const SCOPUS_API_BASE = "https://api.elsevier.com/content/serial/title";

/**
 * Proxy for the Scopus Serial Title API (CiteScore / percentile).
 * Accepts ?issn=XXXX-XXXX and forwards to Elsevier with the server-side API key.
 * Returns the CITESCORE view which includes CiteScore, SJR, SNIP and percentile data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const apiKey = process.env.SCOPUS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SCOPUS_API_KEY não configurada no servidor." },
      { status: 500 },
    );
  }

  const issn = searchParams.get("issn");
  if (!issn) {
    return NextResponse.json(
      { error: "Parâmetro 'issn' é obrigatório." },
      { status: 400 },
    );
  }

  // Validate ISSN format (XXXX-XXXX or XXXXXXXX)
  const issnClean = issn.replace(/[^0-9Xx-]/g, "");
  if (!/^\d{4}-?\d{3}[\dXx]$/.test(issnClean)) {
    return NextResponse.json(
      { error: "Formato de ISSN inválido." },
      { status: 400 },
    );
  }

  const upstream = `${SCOPUS_API_BASE}/issn/${issnClean}?view=CITESCORE`;

  try {
    const resp = await fetch(upstream, {
      headers: {
        "X-ELS-APIKey": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    const body = await resp.text();

    return new NextResponse(body, {
      status: resp.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao consultar Scopus API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
