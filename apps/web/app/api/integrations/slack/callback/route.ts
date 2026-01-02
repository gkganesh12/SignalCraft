import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function GET(req: NextRequest) {
  const { getToken } = auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/integrations?error=missing_code', req.url));
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
  const response = await fetch(`${apiBase}/integrations/slack/install`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    return NextResponse.redirect(new URL('/dashboard/integrations?error=slack_install', req.url));
  }

  return NextResponse.redirect(new URL('/dashboard/integrations?connected=slack', req.url));
}
