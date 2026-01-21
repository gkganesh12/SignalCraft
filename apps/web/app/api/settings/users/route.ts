import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(_req: NextRequest) {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5050';

    try {
        const res = await fetch(`${apiUrl}/api/settings/users`, {
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
        console.error('Users API error:', err);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(_req: NextRequest) {
    // Invite user (Post request to users/invite in backend, but frontend might just post to users/invite directly from this route?
    // Backend route is POST settings/users/invite.
    // Frontend convention: POST /api/settings/users/invite.
    // But here I'll stick to listing users. I'll make a separate route file for invite if needed.
    return NextResponse.json({ error: 'Use /api/settings/users/invite' }, { status: 404 });
}
