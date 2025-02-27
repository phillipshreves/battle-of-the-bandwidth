'use client';

interface CronHelperProps {
    onSelect: (expression: string) => void;
}

export default function CronHelper({ onSelect }: CronHelperProps) {
    const commonSchedules = [
        { label: 'Every day at midnight', expression: '0 0 * * *' },
        { label: 'Every hour', expression: '0 * * * *' },
        { label: 'Every 6 hours', expression: '0 */6 * * *' },
        { label: 'Every 12 hours', expression: '0 */12 * * *' },
        { label: 'Every Monday at 9 AM', expression: '0 9 * * 1' },
        { label: 'Every weekday at 9 AM', expression: '0 9 * * 1-5' },
        { label: 'Every weekend at 10 AM', expression: '0 10 * * 0,6' },
    ];

    return (
        <div className="mt-2">
            <label className="block text-sm font-medium mb-2 text-slate-300">
                Common Schedules
            </label>
            <div className="grid grid-cols-1 gap-2">
                {commonSchedules.map(({ label, expression }) => (
                    <button
                        key={expression}
                        type="button"
                        onClick={() => onSelect(expression)}
                        className="text-left px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
                    >
                        <div className="font-medium">{label}</div>
                        <div className="text-slate-400 text-xs">{expression}</div>
                    </button>
                ))}
            </div>
            <div className="mt-4 text-sm text-slate-400">
                <p className="font-medium mb-1">Cron Format:</p>
                <p className="mb-2">minute hour day month weekday</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>* = any value</li>
                    <li>*/n = every n units</li>
                    <li>1-5 = range from 1 to 5</li>
                    <li>1,3,5 = specific values</li>
                </ul>
            </div>
        </div>
    );
} 