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

interface SpeedTestRequestBody {
    providers?: string[];
    hostEndpoint?: string;
    hostPort?: string;
    scheduleID?: string;
}

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const servers = url.searchParams.getAll("servers");
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");
    const providers = url.searchParams.getAll("providers");
    
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (limit) params.append("limit", limit);
    if (offset) params.append("offset", offset);

    if (servers && servers.length > 0) {
        servers.forEach(server => {
            params.append("server", server);
        });
    }
    
    if (providers && providers.length > 0) {
        providers.forEach(provider => {
            params.append("providers", provider);
        });
    }

    try {
        const url = `${backendUrl}/api/speedtest?${params.toString()}`;
        const response = await fetch(url);
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
    try {
        let providers: string[] | undefined;
        let hostEndpoint: string | undefined;
        let hostPort: string | undefined;
        let scheduleID: string | undefined;
        
        try {
            const body = await request.json();
            providers = body.providers;
            hostEndpoint = body.hostEndpoint;
            hostPort = body.hostPort;
            scheduleID = body.scheduleID;
        } catch (error) {
            console.log('No providers specified in request body');
            console.log(error);
        }
        
        const requestBody: SpeedTestRequestBody = {};
        if (providers) requestBody.providers = providers;
        if (hostEndpoint) requestBody.hostEndpoint = hostEndpoint;
        if (hostPort) requestBody.hostPort = hostPort;
        if (scheduleID) requestBody.scheduleID = scheduleID;
        
        const response = await fetch(`${backendUrl}/api/speedtest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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
