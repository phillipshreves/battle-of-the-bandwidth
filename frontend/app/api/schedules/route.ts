import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const url = id 
            ? `${BACKEND_URL}/api/schedules/${id}`
            : `${BACKEND_URL}/api/schedules`;

        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json({ data: data, error: null });
    } catch (error) {
        console.error('Error fetching schedules:', error);
        return NextResponse.json(
            { data: null, error: 'Failed to fetch schedules' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/api/schedules`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json({ data: data, error: null });
    } catch (error) {
        console.error('Error creating schedule:', error);
        return NextResponse.json(
            { data: null, error: 'Failed to create schedule' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/api/schedules/${body.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json({ data: data.data, error: null });
    } catch (error) {
        console.error('Error updating schedule:', error);
        return NextResponse.json(
            { data: null, error: 'Failed to update schedule' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { data: null, error: 'Schedule ID is required' },
                { status: 400 }
            );
        }

        const response = await fetch(`${BACKEND_URL}/api/schedules/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return NextResponse.json({ data: 'Schedule deleted successfully', error: null });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        return NextResponse.json(
            { data: null, error: 'Failed to delete schedule' },
            { status: 500 }
        );
    }
} 