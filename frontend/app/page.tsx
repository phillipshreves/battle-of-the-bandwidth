'use client';

import {useState, useEffect} from 'react';
import {Serie} from '@nivo/line';
import {format, parseISO} from 'date-fns';
import {SpeedTestData} from '@/types/types';
import SpeedTestChart from './components/SpeedTestChart';
import Filters from './components/Filters';
import Pagination from './components/Pagination';
import DataStatistics from './components/DataStatistics';
import SchedulesTable from '@/app/components/SchedulesTable';

interface FetchFilters {
    startDate?: string;
    endDate?: string;
    servers?: string[];
    providers?: string[];
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
    const queryFilters = { ...filters };
    
    const providers = queryFilters.providers;
    delete queryFilters.providers;
    
    const servers = queryFilters.servers;
    delete queryFilters.servers;
    
    const query = new URLSearchParams(queryFilters as Record<string, string>).toString();
    
    let fullQuery = query;
    
    // Add providers
    if (providers && providers.length > 0) {
        const providersQuery = providers.map(p => `providers=${encodeURIComponent(p)}`).join('&');
        fullQuery = fullQuery ? `${fullQuery}&${providersQuery}` : providersQuery;
    }
    
    // Add servers
    if (servers && servers.length > 0) {
        const serversQuery = servers.map(s => `servers=${encodeURIComponent(s)}`).join('&');
        fullQuery = fullQuery ? `${fullQuery}&${serversQuery}` : serversQuery;
    }
    
    try {
        const response = await fetch(`/api/speedtest?${fullQuery}`);
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
    const [speedTestData, setSpeedTestData] = useState<SpeedTestData[]>([]);
    const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);
    const [selectedServers, setSelectedServers] = useState<string[]>([]);
    const [limit, setLimit] = useState<number>(20);
    const [offset, setOffset] = useState<number>(0);
    const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
    const [availableServers, setAvailableServers] = useState<string[]>([]);
    const [availableProviders, setAvailableProviders] = useState<{ id: string, name: string }[]>([]);
    const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
    const [useLocalTime, setUseLocalTime] = useState<boolean>(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await fetchSpeedTestData({
                    startDate: dateRange[0] ?? '',
                    endDate: dateRange[1] ?? '',
                    servers: selectedServers,
                    providers: selectedProviders.length > 0 ? selectedProviders : undefined,
                    limit,
                    offset,
                });
                setSpeedTestData(result.data);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, [dateRange, selectedServers, selectedProviders, useLocalTime, limit, offset]);

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
    
    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const response = await fetch('/api/providers');
                if (!response.ok) throw new Error("Failed to fetch providers");
                const result = await response.json();
                setAvailableProviders(result.data || []);
            } catch (error) {
                console.error("Error fetching providers:", error);
            }
        };
        fetchProviders();
    }, []);

    const handleDateChange = (index: 0 | 1, value: string) => {
        const newDateRange = [...dateRange];
        newDateRange[index] = value || null;
        setDateRange(newDateRange as [string | null, string | null]);
    };

    const handleServerChange = (values: string[]) => {
        setSelectedServers(values);
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

    const handleProviderChange = (values: string[]) => {
        setSelectedProviders(values);
    };

    const handleTimeDisplayToggle = () => {
        setUseLocalTime(!useLocalTime);
    };

    const formatTimestamp = (timestamp: string) => {
        const date = parseISO(timestamp);
        console.log(`timestamp: ${timestamp}`)
        if (useLocalTime) {
            return format(date, 'yyyy-MM-dd HH:mm');
        } else {
            const dateISO = date.toISOString();
            return `${dateISO.substring(0, 10)} ${dateISO.substring(11, 16)}Z`
        }
    };

    const chartData: Serie[] = [
        {
            id: "Download Speed (Mbps)",
            data: (speedTestData || [])
                .map((item) => ({
                    x: formatTimestamp(item.timestamp),
                    y: Math.round(Number(item.download) * 10) / 10,
                })),
        } as Serie,
        {
            id: "Upload Speed (Mbps)",
            data: (speedTestData || [])
                .map((item) => ({
                    x: formatTimestamp(item.timestamp),
                    y: Math.round(Number(item.upload) * 10) / 10,
                })),
        } as Serie,
        {
            id: "Ping (ms)",
            data: (speedTestData || [])
                .map((item) => ({
                    x: formatTimestamp(item.timestamp),
                    y: Math.round(Number(item.ping) * 10) / 10,
                })),
        } as Serie
    ];

    return (
        <main className="min-h-screen p-8">
            <div className="gradient-bg fixed inset-0 -z-10"/>

            <div className="max-w-7xl mx-auto space-y-8">
                <header className="text-center">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Battle of the Bandwidth
                    </h1>
                    <p className="text-lg text-gray-500">Network Performance Monitor</p>
                </header>

                <div className="glass-card p-6 space-y-6">
                    <Filters
                        dateRange={dateRange}
                        selectedServers={selectedServers}
                        limit={limit}
                        availableServers={availableServers}
                        availableProviders={availableProviders}
                        selectedProviders={selectedProviders}
                        isOpen={isAdvancedFiltersOpen}
                        useLocalTime={useLocalTime}
                        onDateChange={handleDateChange}
                        onServerChange={handleServerChange}
                        onLimitChange={handleLimitChange}
                        onProvidersChange={handleProviderChange}
                        onTimeDisplayToggle={handleTimeDisplayToggle}
                        onToggle={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
                    />

                    <Pagination
                        offset={offset}
                        limit={limit}
                        dataLength={speedTestData?.length || 0}
                        onPreviousPage={handlePreviousPage}
                        onNextPage={handleNextPage}
                    />

                    <DataStatistics chartData={chartData} />
                    
                    <div className="hidden md:block">
                        <SpeedTestChart chartData={chartData} useLocalTime={useLocalTime} />
                    </div>
                </div>
                <SchedulesTable />
            </div>

            <footer className="mt-8 text-center text-sm text-gray-500 space-y-1">
                <p>Battle of the Bandwidth by Phillip Shreves</p>
                <p>https://github.com/phillipshreves/battle-of-the-bandwidth</p>
                <p>Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0)</p>
            </footer>
        </main>
    );
}

