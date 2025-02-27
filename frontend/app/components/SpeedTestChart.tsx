import {ResponsiveLine, Serie} from '@nivo/line';

interface SpeedTestChartProps {
    chartData: Serie[];
}

export default function SpeedTestChart({chartData}: SpeedTestChartProps) {
    return (
        <div className="h-[600px] glass-card p-6">
            {chartData?.length > 0 && chartData.some(series => series?.data?.length > 0) ? (
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
    );
}