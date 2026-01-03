import { LineSeries } from '@nivo/line';

interface DataStatisticsProps {
    chartData: LineSeries[];
}

export default function DataStatistics({ chartData }: DataStatisticsProps) {
    const calculateAverage = (data: LineSeries[], id: string) => {
        const series = data.find(series => series.id === id);
        if (!series || !series.data.length) return 0;
        
        const sum = series.data.reduce((acc, point) => acc + (point.y as number), 0);
        return (sum / series.data.length).toFixed(2);
    };

    const calculateMinMax = (data: LineSeries[], id: string) => {
        const series = data.find(series => series.id === id);
        if (!series || !series.data.length) return { min: 0, max: 0 };
        
        const values = series.data.map(point => point.y as number);
        return {
            min: Math.min(...values).toFixed(2),
            max: Math.max(...values).toFixed(2)
        };
    };

    const uploadAvg = calculateAverage(chartData, 'Upload Speed (Mbps)');
    const downloadAvg = calculateAverage(chartData, 'Download Speed (Mbps)');
    const pingAvg = calculateAverage(chartData, 'Ping (ms)');

    const uploadStats = calculateMinMax(chartData, 'Upload Speed (Mbps)');
    const downloadStats = calculateMinMax(chartData, 'Download Speed (Mbps)');
    const pingStats = calculateMinMax(chartData, 'Ping (ms)');

    return (
        <div className="p-6 grid grid-cols-3 gap-4">
            <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 text-foreground">Download</h3>
                <p className="text-2xl text-foreground">{downloadAvg} <span className="text-sm text-secondary">Mbps</span></p>
                <div className="text-sm mt-2 text-secondary">
                    <p>Max: {downloadStats.max} Mbps</p>
                    <p>Min: {downloadStats.min} Mbps</p>
                </div>
            </div>
            <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 text-foreground">Upload</h3>
                <p className="text-2xl text-foreground">{uploadAvg} <span className="text-sm text-secondary">Mbps</span></p>
                <div className="text-sm mt-2 text-secondary">
                    <p>Max: {uploadStats.max} Mbps</p>
                    <p>Min: {uploadStats.min} Mbps</p>
                </div>
            </div>
            <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 text-foreground">Ping</h3>
                <p className="text-2xl text-foreground">{pingAvg} <span className="text-sm text-secondary">ms</span></p>
                <div className="text-sm mt-2 text-secondary">
                    <p>Max: {pingStats.max} ms</p>
                    <p>Min: {pingStats.min} ms</p>
                </div>
            </div>
        </div>
    );
}