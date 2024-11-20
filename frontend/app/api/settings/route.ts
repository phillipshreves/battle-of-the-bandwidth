import { NextResponse } from 'next/server';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET() {
    try {
        const response = await fetch(`${backendUrl}/api/settings`);
        if (!response.ok) {
            return NextResponse.json({ error: response.body, data: {}});
        }
        const data = await response.json();
        return NextResponse.json({error: "", data: data});
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message, data: {} });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const response = await fetch(`${backendUrl}/api/settings`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        
        if (!response.ok){
            return NextResponse.json({ success: false, error: response.body, data: {}});
        };

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
} 