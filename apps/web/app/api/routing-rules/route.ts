import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export async function GET(_req: NextRequest) {
    const { getToken } = auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${API_BASE}/api/routing-rules`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        return NextResponse.json({ rules: [], total: 0 }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const { getToken } = auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const response = await fetch(`${API_BASE}/api/routing-rules`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}
