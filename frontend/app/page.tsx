'use client';

import {useState, useEffect} from 'react';
import {Serie} from '@nivo/line';
import {format, parseISO} from 'date-fns';
import {SpeedTestData} from '@/types/types';
import Settings from './components/Settings';
import SpeedTestChart from './components/SpeedTestChart';
import Filters from './components/Filters';
import Pagination from './components/Pagination';

interface FetchFilters {
    startDate?: string;
    endDate?: string;
    server?: string;
    limit?: number;
    offset?: number;
}

const defaultSpeedTestData: SpeedTestData = {
    timestamp: new Date().toISOString(),
    server: {name: 'example', url: ''},
    client: {ip: '', hostname: '', city: '', region: '', country: '', loc: '', org: '', postal: '', timezone: ''},
    bytes_sent: 1, bytes_received: 1, ping: 1, jitter: 1, upload: 1, download: 1, share: ''
};

async function fetchSpeedTestData(filters: FetchFilters): Promise<{error: string, data: SpeedTestData[]}> {
    const query = new URLSearchParams(filters as Record<string, string>).toString();
    try {
        const response = await fetch(`/api/speedtest?${query}`);
        if (!response.ok) {
            const responseJson = await response.json();
            const errorMessage = responseJson.error;
            console.error(`Error fetching speed test data: ${errorMessage}`);
            return {error: errorMessage, data:[defaultSpeedTestData]};
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching data:", JSON.stringify(error));
        return {error: `Error fetching data: ${error}`, data:[defaultSpeedTestData]};
    }
}

export default function Home() {
    const [data, setData] = useState<SpeedTestData[]>([]);
    const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);
    const [server, setServer] = useState<string | null>(null);
    const [limit, setLimit] = useState<number>(20);
    const [offset, setOffset] = useState<number>(0);
    const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
    const [availableServers, setAvailableServers] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await fetchSpeedTestData({
                    startDate: dateRange[0] ?? '',
                    endDate: dateRange[1] ?? '',
                    server: server ?? '',
                    limit,
                    offset,
                });
                console.log(`result.data: ${result.data}`)
                setData(result.data);
            } catch (error) {
                console.log("test")
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, [dateRange, server, limit, offset]);

    useEffect(() => {
        const fetchServers = async () => {
            try {
                const response = await fetch('/api/server-names');
                if (!response.ok) throw new Error("Failed to fetch server names");
                const servers = await response.json();
                setAvailableServers(servers.data);
            } catch (error) {
                console.error("Error fetching server names:", error);
            }
        };
        fetchServers();
    }, []);

    const chartData: Serie[] = [
        {
            id: "Download Speed (Mbps)",
            data: (data || [])
                .filter(item =>
                    item?.timestamp &&
                    !isNaN(item.download) &&
                    Number.isFinite(Number(item.download))
                )
                .map((item) => ({
                    x: format(parseISO(item.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                    y: Math.round(Number(item.download) * 100) / 100,
                })),
        } as Serie,
        {
            id: "Upload Speed (Mbps)",
            data: (data || [])
                .filter(item =>
                    item?.timestamp &&
                    !isNaN(item.upload) &&
                    Number.isFinite(Number(item.upload))
                )
                .map((item) => ({
                    x: format(parseISO(item.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                    y: Math.round(Number(item.upload) * 100) / 100,
                })),
        } as Serie,
        {
            id: "Ping (ms)",
            data: (data || [])
                .filter(item =>
                    item?.timestamp &&
                    !isNaN(item.ping) &&
                    Number.isFinite(Number(item.ping))
                )
                .map((item) => ({
                    x: format(parseISO(item.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                    y: Math.round(Number(item.ping) * 100) / 100,
                })),
        } as Serie
    ];

    const handleDateChange = (index: 0 | 1, value: string) => {
        const newDateRange = [...dateRange];
        newDateRange[index] = value || null;
        setDateRange(newDateRange as [string | null, string | null]);
    };

    const handleServerChange = (value: string) => {
        setServer(value || null);
    };

    const handleLimitChange = (value: string) => {
        const newLimit = parseInt(value, 10);
        setLimit(isNaN(newLimit) ? 10 : newLimit);
    };

    const handlePreviousPage = () => {
        if (offset - limit >= 0) {
            setOffset(offset - limit);
        }
    };

    const handleNextPage = () => {
        setOffset(offset + limit);
    };

    return (
        <main className="min-h-screen p-8">
            {/* Background gradient */}
            <div className="gradient-bg fixed inset-0 -z-10"/>

            <div className="max-w-7xl mx-auto space-y-8">
                <header className="text-center">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Network Performance Monitor
                    </h1>
                    <p className="text-secondary">Monitor your network speeds over time</p>
                </header>

                <div className="glass-card p-6 space-y-6">
                    <Filters
                        dateRange={dateRange}
                        server={server}
                        limit={limit}
                        availableServers={availableServers}
                        isOpen={isAdvancedFiltersOpen}
                        onDateChange={handleDateChange}
                        onServerChange={handleServerChange}
                        onLimitChange={handleLimitChange}
                        onToggle={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
                    />

                    <Pagination
                        offset={offset}
                        limit={limit}
                        dataLength={data.length}
                        onPreviousPage={handlePreviousPage}
                        onNextPage={handleNextPage}
                    />

                    <SpeedTestChart chartData={chartData} />
                </div>
            </div>

            {/* Add Settings component */}
            <Settings />
        </main>
    );
}
