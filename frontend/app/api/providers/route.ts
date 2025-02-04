import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/providers`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json({ data: data.data, error: null });
    } catch (error) {
        console.error('Error fetching providers:', error);
        return NextResponse.json(
            { data: null, error: 'Failed to fetch providers' },
            { status: 500 }
        );
    }
} 