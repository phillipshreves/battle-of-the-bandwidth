import { NextResponse } from 'next/server';

interface ServerResponse {
    timestamp: string;
    server: {
        name: string;
        url: string;
    };
    client: {
        ip: string;
        hostname: string;
        city: string;
        region: string;
        country: string;
        loc: string;
        org: string;
        postal: string;
        timezone: string;
    };
    bytes_sent: number;
    bytes_received: number;
    ping: number;
    jitter: number;
    upload: number;
    download: number;
    share: string;
}

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const server = url.searchParams.get("server");
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");

    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (server) params.append("server", server);
    if (limit) params.append("limit", limit);
    if (offset) params.append("offset", offset);

    try {
        const response = await fetch(`${backendUrl}/api/bandwidth?${params.toString()}`);
        if (!response.ok) {
            return NextResponse.json({ error: JSON.stringify(response), data: [] });
        }

        const data: ServerResponse[] = await response.json();
        return NextResponse.json({error: "", data: data});
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message, data: [] });
    }
}
