'use client';

import { useState, useEffect } from 'react';
import { ResponsiveLine, Serie } from '@nivo/line';
import { format, parseISO } from 'date-fns';
import { SpeedTestData } from '@/types/types';

interface FetchFilters {
  startDate?: string;
  endDate?: string;
  server?: string;
  limit?: number;
  offset?: number;
}

async function fetchSpeedTestData(filters: FetchFilters): Promise<SpeedTestData[]> {
  const query = new URLSearchParams(filters as Record<string, string>).toString();
  try {
    const response = await fetch(`/api/speedtest?${query}`);
    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`Error fetching speed test data: ${errorMessage}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw new Error("Error fetching speed test data");
  }
}

export default function Home() {
  const [data, setData] = useState<SpeedTestData[]>([]);
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);
  const [server, setServer] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(10);
  const [offset] = useState<number>(0);

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
        setData(result);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [dateRange, server, limit, offset]);

  const chartData: Serie[] = [
    {
      id: "Download Speed (Mbps)",
      data: data
        .filter(item => 
          item.timestamp && 
          item.download !== null && 
          item.download !== undefined && 
          !isNaN(item.download) &&
          Number.isFinite(Number(item.download))
        )
        .map((item) => ({
          x: format(parseISO(item.timestamp), 'Pp'),
          y: Math.round(Number(item.download) * 100) / 100,
        })),
    } as Serie,
    {
      id: "Upload Speed (Mbps)",
      data: data
        .filter(item => 
          item.timestamp && 
          item.upload !== null && 
          item.upload !== undefined && 
          !isNaN(item.upload) &&
          Number.isFinite(Number(item.upload))
        )
        .map((item) => ({
          x: format(parseISO(item.timestamp), 'Pp'),
          y: Math.round(Number(item.upload) * 100) / 100,
        })),
    } as Serie,
    {
      id: "Ping (ms)",
      data: data
        .filter(item => 
          item.timestamp && 
          item.ping !== null && 
          item.ping !== undefined && 
          !isNaN(item.ping) &&
          Number.isFinite(Number(item.ping))
        )
        .map((item) => ({
          x: format(parseISO(item.timestamp), 'Pp'),
          y: Math.round(Number(item.ping) * 100) / 100,
        })),
    } as Serie,
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

  return (
    <div className="min-h-screen p-8 relative overflow-hidden">
      {/* Background gradient */}
      <div className="gradient-bg fixed inset-0 -z-10" />

      <div className="max-w-7xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Network Performance Monitor
          </h1>
          <p className="text-secondary">Monitor your network speeds over time</p>
        </header>

        <div className="glass-card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary">Start Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 rounded-lg bg-background/80 border border-secondary/20 
                         focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                         transition-colors duration-200 text-foreground"
                value={dateRange[0] || ''}
                onChange={(e) => handleDateChange(0, e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary">End Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 rounded-lg bg-background/80 border border-secondary/20 
                         focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                         transition-colors duration-200 text-foreground"
                value={dateRange[1] || ''}
                onChange={(e) => handleDateChange(1, e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary">Server</label>
              <select
                className="w-full h-[38px] px-4 py-2 rounded-lg bg-background/80 border border-secondary/20 
                         focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                         transition-colors duration-200 text-foreground"
                value={server || ''}
                onChange={(e) => handleServerChange(e.target.value)}
              >
                <option value="">All Servers</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary">Results Limit</label>
              <input
                type="number"
                className="w-full px-4 py-2 rounded-lg bg-background/80 border border-secondary/20 
                         focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                         transition-colors duration-200 text-foreground"
                value={limit}
                onChange={(e) => handleLimitChange(e.target.value)}
              />
            </div>
          </div>

          <div className="h-[600px] glass-card p-6">
            {chartData.every(serie => serie.data.length > 0) ? (
              <ResponsiveLine
                data={chartData}
                margin={{ top: 50, right: 110, bottom: 80, left: 60 }}
                xScale={{ type: 'point' }}
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
                  legend: 'Time',
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
                pointColor={{ theme: 'background' }}
                pointBorderWidth={2}
                pointBorderColor={{ from: 'serieColor' }}
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
                          itemOpacity: 1
                        }
                      }
                    ]
                  }
                ]}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-secondary">No data available for the selected filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}