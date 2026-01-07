import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5050';
    const { id } = params;

    try {
        const res = await fetch(`${API_BASE}/api/session-replay/alert-group/${id}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            if (res.status === 404) {
                return NextResponse.json({ hasReplay: false }, { status: 200 });
            }
            return NextResponse.json(null, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({ hasReplay: true, ...data });
    } catch (err) {
        console.error('Session replay API error:', err);
        return NextResponse.json({ hasReplay: false }, { status: 200 });
    }
}
