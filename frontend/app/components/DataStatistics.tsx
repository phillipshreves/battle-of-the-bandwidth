import { Serie } from '@nivo/line';

interface DataStatisticsProps {
    chartData: Serie[];
}

export default function DataStatistics({ chartData }: DataStatisticsProps) {
    const calculateAverage = (data: Serie[], id: string) => {
        const series = data.find(series => series.id === id);
        if (!series || !series.data.length) return 0;
        
        const sum = series.data.reduce((acc, point) => acc + (point.y as number), 0);
        return (sum / series.data.length).toFixed(2);
    };

    const uploadAvg = calculateAverage(chartData, 'Upload');
    const downloadAvg = calculateAverage(chartData, 'Download');
    const pingAvg = calculateAverage(chartData, 'Ping');

    return (
        <div className="glass-card p-6 grid grid-cols-3 gap-4">
            <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Average Download</h3>
                <p className="text-2xl">{downloadAvg} <span className="text-sm">Mbps</span></p>
            </div>
            <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Average Upload</h3>
                <p className="text-2xl">{uploadAvg} <span className="text-sm">Mbps</span></p>
            </div>
            <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Average Ping</h3>
                <p className="text-2xl">{pingAvg} <span className="text-sm">ms</span></p>
            </div>
        </div>
    );
}