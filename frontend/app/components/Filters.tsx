interface FiltersProps {
    dateRange: [string | null, string | null];
    selectedServers: string[];
    limit: number;
    availableServers: string[];
    availableProviders: { id: string, name: string }[];
    selectedProviders: string[];
    isOpen: boolean;
    useLocalTime: boolean;
    onDateChange: (index: 0 | 1, value: string) => void;
    onServerChange: (values: string[]) => void;
    onLimitChange: (value: string) => void;
    onProvidersChange: (values: string[]) => void;
    onTimeDisplayToggle: () => void;
    onToggle: () => void;
}

export default function Filters({
    dateRange,
    selectedServers,
    limit,
    availableServers,
    availableProviders,
    selectedProviders,
    isOpen,
    useLocalTime,
    onDateChange,
    onServerChange,
    onLimitChange,
    onProvidersChange,
    onTimeDisplayToggle,
    onToggle
}: FiltersProps) {
    if(!availableServers) {
        availableServers = []
    }
    if(!availableProviders) {
        availableProviders = []
    }
    
    const handleServerChange = (serverName: string) => {
        if (selectedServers.includes(serverName)) {
            // Remove server if already selected
            onServerChange(selectedServers.filter(name => name !== serverName));
        } else {
            // Add server if not selected
            onServerChange([...selectedServers, serverName]);
        }
    };
    
    const handleProviderChange = (providerId: string) => {
        if (selectedProviders.includes(providerId)) {
            // Remove provider if already selected
            onProvidersChange(selectedProviders.filter(id => id !== providerId));
        } else {
            // Add provider if not selected
            onProvidersChange([...selectedProviders, providerId]);
        }
    };
    
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

                    <div className="flex items-start gap-4">
                        <label className="text-sm font-medium text-secondary w-32 pt-2">Server Selection</label>
                        <div className="flex-1 flex flex-wrap gap-2">
                            {availableServers.map((serverName) => (
                                <div key={serverName} className="flex items-center">
                                    <label className="flex items-center space-x-2 cursor-pointer px-3 py-2 rounded-lg bg-background/80 border border-secondary/20 hover:border-primary transition-colors">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-4 w-4 text-primary rounded focus:ring-primary"
                                            checked={selectedServers.includes(serverName)}
                                            onChange={() => handleServerChange(serverName)}
                                        />
                                        <span className="text-sm">{serverName}</span>
                                    </label>
                                </div>
                            ))}
                            {availableServers.length === 0 && (
                                <div className="text-sm text-secondary italic">No servers available</div>
                            )}
                        </div>
                    </div>
                    
                    {/* Provider Selection Filter */}
                    <div className="flex items-start gap-4">
                        <label className="text-sm font-medium text-secondary w-32 pt-2">Providers</label>
                        <div className="flex-1 flex flex-wrap gap-2">
                            {availableProviders.map((provider) => (
                                <div key={provider.id} className="flex items-center">
                                    <label className="flex items-center space-x-2 cursor-pointer px-3 py-2 rounded-lg bg-background/80 border border-secondary/20 hover:border-primary transition-colors">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-4 w-4 text-primary rounded focus:ring-primary"
                                            checked={selectedProviders.includes(provider.id)}
                                            onChange={() => handleProviderChange(provider.id)}
                                        />
                                        <span className="text-sm">{provider.name}</span>
                                    </label>
                                </div>
                            ))}
                            {availableProviders.length === 0 && (
                                <div className="text-sm text-secondary italic">No providers available</div>
                            )}
                        </div>
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

                    {/* Time Display Toggle */}
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-secondary w-32">Time Display</label>
                        <div className="flex items-center gap-3">
                                <span className="ml-3 text-sm font-medium">
                                    UTC
                                </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={useLocalTime}
                                    onChange={onTimeDisplayToggle}
                                />
                                <div className="w-11 h-6 bg-secondary/30 peer-focus:outline-none peer-focus:ring-4 
                                peer-focus:ring-primary/20 rounded-full peer 
                                peer-checked:after:translate-x-full peer-checked:after:border-white 
                                after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                after:bg-white after:border-secondary/20 after:border after:rounded-full 
                                after:h-5 after:w-5 after:transition-all peer-checked:bg-primary
                                border border-secondary/50"></div>
                            </label>
                                <span className="ml-3 text-sm font-medium">
                                    Local Time 
                                </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}