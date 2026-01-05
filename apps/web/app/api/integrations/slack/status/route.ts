import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function GET(_req: NextRequest) {
  const { getToken } = auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
  const response = await fetch(`${apiBase}/integrations/slack/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return NextResponse.json({ connected: false }, { status: 500 });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
