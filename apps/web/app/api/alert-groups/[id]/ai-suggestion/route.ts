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
        const res = await fetch(`${API_BASE}/api/alert-groups/${id}/ai-suggestion`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('AI Suggestion API error:', res.status, errorText);
            try {
                return NextResponse.json(JSON.parse(errorText), { status: res.status });
            } catch {
                return NextResponse.json({ error: errorText || res.statusText }, { status: res.status });
            }
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('AI Suggestion fetch error:', err);
        return NextResponse.json({ enabled: false, suggestion: null }, { status: 200 });
    }
}
