import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { method, url, headers, body } = await req.json();

  try {
    const fetchOpts: RequestInit = {
      method,
      headers: { ...headers },
    };

    if (body && method !== 'GET') {
      fetchOpts.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOpts);
    let responseBody: unknown;
    const text = await res.text();
    try {
      responseBody = JSON.parse(text);
    } catch {
      responseBody = text;
    }

    return NextResponse.json({ status: res.status, body: responseBody });
  } catch (err) {
    return NextResponse.json(
      { status: 0, body: null, error: err instanceof Error ? err.message : 'Proxy error' },
      { status: 502 }
    );
  }
}
