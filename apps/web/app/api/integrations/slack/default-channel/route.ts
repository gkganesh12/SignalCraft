import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function POST(req: NextRequest) {
  const { getToken } = auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
  const response = await fetch(`${apiBase}/integrations/slack/default-channel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}
