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
        const res = await fetch(`${API_BASE}/api/alert-groups/${id}/breadcrumbs`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            // Return empty array for 404 (no breadcrumbs found)
            if (res.status === 404) {
                return NextResponse.json([]);
            }
            const errorText = await res.text();
            console.error('Breadcrumbs API error:', res.status, errorText);
            return NextResponse.json([], { status: 200 });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('Breadcrumbs fetch error:', err);
        return NextResponse.json([], { status: 200 });
    }
}
