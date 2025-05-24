export interface ServerData {
    name: string;
    url: string;
}

export interface ClientData {
    ip: string;
    hostname: string;
    city: string;
    region: string;
    country: string;
    loc: string;
    org: string;
    postal: string;
    timezone: string;
}

export interface SpeedTestData {
    timestamp: string;
    server: ServerData;
    client: ClientData;
    bytes_sent: number;
    bytes_received: number;
    ping: number;
    jitter: number;
    upload: number;
    download: number;
    share: string;
}

export interface UserSettings {
    id: number;
    speedtest_frequency: number;
    created_at: string;
    updated_at: string;
}

export interface Schedule {
    id: string;
    name: string;
    cron_expression: string;
    provider_id: string;
    provider_name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    host_endpoint?: string;
    host_port?: string;
    result_limit: number;
}
