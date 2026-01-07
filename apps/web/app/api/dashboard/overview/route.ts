import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5050';

    try {
        const res = await fetch(`${apiUrl}/api/dashboard/overview`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Dashboard Overview Backend Error:', res.status, errorText);
            try {
                const errorJson = JSON.parse(errorText);
                return NextResponse.json(errorJson, { status: res.status });
            } catch {
                return NextResponse.json({ error: errorText || res.statusText }, { status: res.status });
            }
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('Dashboard API error:', err);
        return NextResponse.json({
            error: 'Failed to fetch dashboard data',
            details: err instanceof Error ? err.message : String(err),
            cause: err instanceof Error && err.cause ? String(err.cause) : undefined
        }, { status: 500 });
    }
}
