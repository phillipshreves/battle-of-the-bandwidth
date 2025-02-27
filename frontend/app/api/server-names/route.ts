import { NextResponse } from 'next/server';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET() {
    try {
        const response = await fetch(`${backendUrl}/api/server-names`);
        if (!response.ok) {
            return NextResponse.json({ error: response.body, data: []});
        }
        const data: string[] = await response.json();
        return NextResponse.json({error: "", data: data});
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message, data: [] });
    }
} 