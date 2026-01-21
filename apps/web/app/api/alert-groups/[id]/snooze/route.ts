import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const duration = req.nextUrl.searchParams.get('duration') ?? '60';
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5050';

    try {
        const res = await fetch(`${apiUrl}/api/alert-groups/${id}/snooze?duration=${duration}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            return NextResponse.json(error, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('Snooze API error:', err);
        return NextResponse.json({ error: 'Failed to snooze alert' }, { status: 500 });
    }
}
