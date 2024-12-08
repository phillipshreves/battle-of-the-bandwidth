interface FiltersProps {
    dateRange: [string | null, string | null];
    server: string | null;
    limit: number;
    availableServers: string[];
    isOpen: boolean;
    onDateChange: (index: 0 | 1, value: string) => void;
    onServerChange: (value: string) => void;
    onLimitChange: (value: string) => void;
    onToggle: () => void;
}

export default function Filters({
    dateRange,
    server,
    limit,
    availableServers,
    isOpen,
    onDateChange,
    onServerChange,
    onLimitChange,
    onToggle
}: FiltersProps) {
    if(!availableServers) {
        availableServers = []
    }
    return (
        <div className="border-t border-secondary/20 pt-4">
            <button
                onClick={onToggle}
                className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
            >
                <span>Filters</span>
                <svg
                    className={`w-4 h-4 transform transition-transform ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
            </button>

            {isOpen && (
                <div className="mt-4 space-y-4">
                    {/* Date Range Filters */}
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-secondary w-32">Date Range</label>
                        <div className="flex-1 flex gap-4">
                            <div className="flex-1 flex items-center gap-3">
                                <input
                                    type="date"
                                    placeholder="Start Date"
                                    className="w-full px-4 py-2 rounded-lg bg-background/80 border border-secondary/20
                                    focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                                    transition-colors duration-200 text-background"
                                    value={dateRange[0] || ''}
                                    onChange={(e) => onDateChange(0, e.target.value)}
                                />
                            </div>
                            <div className="flex-1 flex items-center gap-3">
                                <input
                                    type="date"
                                    placeholder="End Date"
                                    className="w-full px-4 py-2 rounded-lg bg-background/80 border border-secondary/20
                                    focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                                    transition-colors duration-200 text-background"
                                    value={dateRange[1] || ''}
                                    onChange={(e) => onDateChange(1, e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-secondary w-32">Server Selection</label>
                        <select
                            className="flex-1 px-4 py-2 rounded-lg bg-background/80 border border-secondary/20
                            focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                            transition-colors duration-200 text-background"
                            value={server || ''}
                            onChange={(e) => onServerChange(e.target.value)}
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
                            onChange={(e) => onLimitChange(e.target.value)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}