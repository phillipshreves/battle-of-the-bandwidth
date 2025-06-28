import { NextResponse } from 'next/server';

interface ChartColorSettings {
    seriesId: string;
    lineColor: string;
    pointColor: string;
}

interface ChartColorsRequest {
    colors: ChartColorSettings[];
}

interface ChartColorsResponse {
    data: ChartColorSettings[];
    error: string;
}

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET() {
    try {
        const response = await fetch(`${backendUrl}/api/chart-colors`);
        
        if (!response.ok) {
            return NextResponse.json({ 
                error: `Backend error: ${response.status} ${response.statusText}`, 
                data: [] 
            });
        }

        const data: ChartColorsResponse = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.log(`GET chart-colors error: ${JSON.stringify(error)}`);
        return NextResponse.json({ 
            error: (error as Error).message, 
            data: [] 
        });
    }
}

export async function POST(request: Request) {
    try {
        const body: ChartColorsRequest = await request.json();
        
        const response = await fetch(`${backendUrl}/api/chart-colors`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return NextResponse.json({ 
                error: `Backend error: ${response.status} ${response.statusText}`, 
                data: "Failed" 
            });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.log(`POST chart-colors error: ${JSON.stringify(error)}`);
        return NextResponse.json({ 
            error: (error as Error).message, 
            data: "Failed" 
        });
    }
} 