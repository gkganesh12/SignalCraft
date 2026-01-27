import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5050';
  const origin = req.nextUrl.origin;

  try {
    const res = await fetch(`${apiUrl}/api/integrations/jira/oauth/start`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ returnUrl: `${origin}/dashboard/integrations?jira=connected` }),
    });

    if (!res.ok) {
      return NextResponse.redirect(new URL('/dashboard/integrations?jira=error', req.url));
    }

    const data = await res.json();
    return NextResponse.redirect(data.url);
  } catch (err) {
    console.error('Jira OAuth start error:', err);
    return NextResponse.redirect(new URL('/dashboard/integrations?jira=error', req.url));
  }
}
