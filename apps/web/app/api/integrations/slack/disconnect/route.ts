import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function POST(_req: NextRequest) {
  const { getToken } = auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
  const response = await fetch(`${apiBase}/integrations/slack/disconnect`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}
