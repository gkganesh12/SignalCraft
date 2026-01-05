import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export async function POST(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { getToken } = auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${API_BASE}/api/routing-rules/${params.id}/disable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}
