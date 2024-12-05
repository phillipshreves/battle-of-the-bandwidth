'use client';

import {useState, useEffect} from 'react';
import {ResponsiveLine, Serie} from '@nivo/line';
import {format, parseISO} from 'date-fns';
import {SpeedTestData} from '@/types/types';
import Settings from './components/Settings';

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
                    {/* Date Range Filters */}
                    <div className="flex flex-wrap gap-8">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-secondary whitespace-nowrap">Start Date</label>
                            <input
                                type="date"
                                className="px-4 py-2 rounded-lg bg-background/80 border border-secondary/20
                         focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                         transition-colors duration-200 text-background"
                                value={dateRange[0] || ''}
                                onChange={(e) => handleDateChange(0, e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-secondary whitespace-nowrap">End Date</label>
                            <input
                                type="date"
                                className="px-4 py-2 rounded-lg bg-background/80 border border-secondary/20
                         focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                         transition-colors duration-200 text-background"
                                value={dateRange[1] || ''}
                                onChange={(e) => handleDateChange(1, e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Advanced Filters Dropdown */}
                    <div className="border-t border-secondary/20 pt-4">
                        <button
                            onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
                            className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
                        >
                            <span>Advanced Filters</span>
                            <svg
                                className={`w-4 h-4 transform transition-transform ${
                                    isAdvancedFiltersOpen ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>

                        {isAdvancedFiltersOpen && (
                            <div className="mt-4 space-y-4">
                                <div className="flex items-center gap-4">
                                    <label className="text-sm font-medium text-secondary w-32">Server Selection</label>
                                    <select
                                        className="flex-1 px-4 py-2 rounded-lg bg-background/80 border border-secondary/20
                             focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                             transition-colors duration-200 text-background"
                                        value={server || ''}
                                        onChange={(e) => handleServerChange(e.target.value)}
                                    >
                                        <option value="">All Servers</option>
                                        {availableServers.map((serverName) => (
                                            <option key={serverName} value={serverName}>
                                                {serverName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="text-sm font-medium text-secondary w-32">Max Data Points</label>
                                    <input
                                        type="number"
                                        className="flex-1 px-4 py-2 rounded-lg bg-background/80 border border-secondary/20
                             focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                             transition-colors duration-200 text-background"
                                        value={limit}
                                        onChange={(e) => handleLimitChange(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Data Point Pagination */}
                    <div className="flex items-center justify-center gap-4 py-4">
                        <button
                            className="px-4 py-2 rounded-lg bg-secondary/10 hover:bg-secondary/20
                       transition-colors duration-200 text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handlePreviousPage}
                            disabled={offset === 0}
                        >
                            ← Newer
                        </button>
                        <span className="text-secondary">
              {data && data.length > 0 ? `Showing ${offset + 1} - ${offset + Math.min(limit, data.length)} results` : 'No results'}
            </span>
                        <button
                            className="px-4 py-2 rounded-lg bg-secondary/10 hover:bg-secondary/20
                       transition-colors duration-200 text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleNextPage}
                            disabled={!data || data.length < limit}
                        >
                            Older →
                        </button>
                    </div>

                    <div className="h-[600px] glass-card p-6">
                        {chartData && chartData.some(series => series?.data?.length > 0) ? (
                            <ResponsiveLine
                                data={chartData}
                                margin={{top: 20, right: 180, bottom: 120, left: 100}}
                                xScale={{type: 'point'}}
                                yScale={{
                                    type: 'linear',
                                    min: 'auto',
                                    max: 'auto',
                                    stacked: false,
                                    reverse: false,
                                }}
                                axisBottom={{
                                    tickSize: 5,
                                    tickPadding: 5,
                                    tickRotation: -45,
                                    legend: '',
                                    legendOffset: 36,
                                    legendPosition: 'middle'
                                }}
                                axisLeft={{
                                    tickSize: 5,
                                    tickPadding: 5,
                                    tickRotation: 0,
                                    legend: 'Speed (Mbps) / Ping (ms)',
                                    legendOffset: -40,
                                    legendPosition: 'middle'
                                }}
                                enablePoints={true}
                                pointSize={8}
                                pointColor={{theme: 'background'}}
                                pointBorderWidth={2}
                                pointBorderColor={{from: 'serieColor'}}
                                pointLabelYOffset={-12}
                                useMesh={true}
                                theme={{
                                    axis: {
                                        ticks: {
                                            text: {
                                                fill: 'var(--secondary)'
                                            }
                                        },
                                        legend: {
                                            text: {
                                                fill: 'var(--secondary)'
                                            }
                                        }
                                    },
                                    grid: {
                                        line: {
                                            stroke: 'var(--secondary)',
                                            strokeOpacity: 0.1
                                        }
                                    },
                                    legends: {
                                        text: {
                                            fill: 'var(--foreground)'
                                        }
                                    },
                                    tooltip: {
                                        container: {
                                            color: 'var(--background)'
                                        }
                                    }
                                }}
                                legends={[
                                    {
                                        anchor: 'bottom-right',
                                        direction: 'column',
                                        justify: false,
                                        translateX: 100,
                                        translateY: -20,
                                        itemsSpacing: 0,
                                        itemDirection: 'left-to-right',
                                        itemWidth: 80,
                                        itemHeight: 20,
                                        itemOpacity: 0.75,
                                        symbolSize: 12,
                                        symbolShape: 'circle',
                                        symbolBorderColor: 'rgba(0, 0, 0, .5)',
                                        effects: [
                                            {
                                                on: 'hover',
                                                style: {
                                                    itemBackground: 'rgba(0, 0, 0, .03)',
                                                    itemOpacity: 1,
                                                }
                                            }
                                        ]
                                    }
                                ]}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-secondary text-lg">No data available for the selected date range</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Settings component */}
            <Settings />
        </main>
    );
}