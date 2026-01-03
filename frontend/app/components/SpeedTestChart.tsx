'use client';

import { ResponsiveLine, Serie } from '@nivo/line';
import { useState, useMemo } from 'react';
import { useChartColors } from '../hooks/useChartColors';
import SeriesColorCustomizer from './SeriesColorCustomizer';

interface SpeedTestChartProps {
    chartData: Serie[];
    useLocalTime?: boolean;
}

// Map full series names to simplified IDs used in color system
const SERIES_NAME_TO_ID_MAP: Record<string, string> = {
    "Download Speed (Mbps)": "download",
    "Upload Speed (Mbps)": "upload",
    "Ping (ms)": "ping"
};

const seriesNameToId = (seriesName: unknown): string => {
    const name = String(seriesName || '');
    return SERIES_NAME_TO_ID_MAP[name] || 'unknown';
};

export default function SpeedTestChart({ chartData, useLocalTime = false }: SpeedTestChartProps) {
    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
    const {
        seriesColors: seriesColorConfigs,
        setSeriesColors,
        isLoading: colorsLoading,
        isSaving,
        saveColors,
        getColorMapping
    } = useChartColors();

    // Recalculate color mapping whenever seriesColors changes
    const colorMapping = useMemo(() => getColorMapping(), [getColorMapping]);

    const styledChartData: Serie[] = chartData.map(serie => {
        const seriesId = seriesNameToId(serie.id);
        return {
            ...serie,
            color: colorMapping[seriesId]?.lineColor || serie.color
        };
    });

    const handleSaveColors = async () => {
        const success = await saveColors(seriesColorConfigs);
        if (success) {
            setIsCustomizerOpen(false);
        }
    };

    const handleCancelCustomization = () => {
        setIsCustomizerOpen(false);
        // Note: seriesColors will remain unchanged until save is called
    };

    // Create colors array matching the order of series in chartData
    const seriesColors = useMemo(() => {
        return styledChartData.map(serie => {
            const seriesId = seriesNameToId(serie.id);
            return colorMapping[seriesId]?.lineColor || '#FFFFFF';
        });
    }, [styledChartData, colorMapping]);

    // Create a mapping from serie id (full name) to point color
    const pointColorMapping = useMemo(() => {
        const mapping: Record<string, string> = {};
        styledChartData.forEach(serie => {
            const seriesId = seriesNameToId(serie.id);
            mapping[String(serie.id)] = colorMapping[seriesId]?.pointColor || '#FFFFFF';
        });
        return mapping;
    }, [styledChartData, colorMapping]);

    return (
        <>
            <div className="h-[600px] glass-card p-6">
                <div className="flex justify-between items-center mb-2">
                    <button
                        onClick={() => setIsCustomizerOpen(true)}
                        className="flex items-center space-x-2 px-3 py-1 text-xs font-medium rounded-md bg-background/60 text-secondary hover:bg-background/80 transition-colors duration-200"
                        disabled={colorsLoading}
                        title="Customize chart colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5H9a2 2 0 00-2 2v12a4 4 0 004 4h6a2 2 0 002-2V7a2 2 0 00-2-2z" />
                        </svg>
                        <span>{colorsLoading ? 'Loading...' : 'Colors'}</span>
                    </button>

                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-background/60 text-secondary">
                        Time: {useLocalTime ? 'Local' : 'UTC'}
                    </span>
                </div>

                {styledChartData?.length > 0 && styledChartData.some(series => series?.data?.length > 0) ? (
                    <ResponsiveLine
                        data={styledChartData}
                        colors={seriesColors}
                        margin={{ top: 20, right: 180, bottom: 120, left: 100 }}
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
                        pointColor={(point: { id: string }) => {
                            return pointColorMapping[point.id] || '#FFFFFF';
                        }}
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

            <SeriesColorCustomizer
                seriesColors={seriesColorConfigs}
                onColorsChange={setSeriesColors}
                onSave={handleSaveColors}
                onCancel={handleCancelCustomization}
                isVisible={isCustomizerOpen}
                isLoading={isSaving}
            />
        </>
    );
}
