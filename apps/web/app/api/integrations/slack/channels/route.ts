import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function GET(_req: NextRequest) {
  const { getToken } = auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json([], { status: 401 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
  const response = await fetch(`${apiBase}/integrations/slack/channels`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return NextResponse.json([], { status: 500 });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
