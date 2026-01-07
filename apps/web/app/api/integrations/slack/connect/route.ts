import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

const scopes = [
  'chat:write',
  'channels:read',
  'groups:read',
  'users:read',
].join(',');

export async function GET(req: NextRequest) {
  const { getToken } = auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5050';
  const workspaceResponse = await fetch(`${apiBase}/auth/workspace`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!workspaceResponse.ok) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 400 });
  }

  const workspace = await workspaceResponse.json();
  const state = Buffer.from(JSON.stringify({ workspaceId: workspace.id })).toString('base64');

  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID ?? '',
    scope: scopes,
    redirect_uri: process.env.SLACK_REDIRECT_URI ?? '',
    state,
  });

  const url = `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  return NextResponse.redirect(url);
}
