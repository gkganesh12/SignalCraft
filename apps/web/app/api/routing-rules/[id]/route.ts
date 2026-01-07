import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5050';

export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { getToken } = auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${API_BASE}/api/routing-rules/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}

export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { getToken } = auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const response = await fetch(`${API_BASE}/api/routing-rules/${params.id}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { getToken } = auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${API_BASE}/api/routing-rules/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ success: true });
}
