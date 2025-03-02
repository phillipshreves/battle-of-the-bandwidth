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
    // Handle GET request to fetch speed test results
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const server = url.searchParams.get("server");
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");
    const providers = url.searchParams.getAll("providers");

    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (server) params.append("server", server);
    if (limit) params.append("limit", limit);
    if (offset) params.append("offset", offset);
    
    // Add all providers to the params
    if (providers && providers.length > 0) {
        providers.forEach(provider => {
            params.append("providers", provider);
        });
    }

    try {
        const response = await fetch(`${backendUrl}/api/speedtest?${params.toString()}`);
        if (!response.ok) {
            return NextResponse.json({ error: JSON.stringify(response), data: [] });
        }

        const data: ServerResponse[] = await response.json();
        return NextResponse.json({ error: "", data: data });
    } catch (error) {
        console.log(`GET error: ${JSON.stringify(error)}`)
        return NextResponse.json({ error: (error as Error).message, data: [] });
    }
}

export async function POST(request: Request) {
    // Handle POST request to run the speed test
    try {
        // Get providers from request body if available
        let providers: string[] | undefined;
        
        try {
            const body = await request.json();
            providers = body.providers;
        } catch (error) {
            // If there's no body or it can't be parsed, continue without providers
            console.log('No providers specified in request body');
            console.log(error);
        }
        
        const response = await fetch(`${backendUrl}/api/speedtest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: providers ? JSON.stringify({ providers }) : undefined,
        });

        if (!response.ok) {
            return NextResponse.json({ error: response.body, data: {} });
        }

        const result = await response.json();
        return NextResponse.json({ error: "", data: result });
    } catch (error) {
        console.log(`POST error: ${error}`)
        console.log(`POST error JSON: ${JSON.stringify(error)}`)
        return NextResponse.json({ error: (error as Error).message, data: {} });
    }
}
