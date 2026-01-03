'use client';

import { useState } from 'react';
import ColorPickerWidget from './ColorPickerWidget';

export interface SeriesColorConfig {
    seriesId: string;
    lineColor: string;
    pointColor: string;
}

interface SeriesColorCustomizerProps {
    seriesColors: SeriesColorConfig[];
    onColorsChange: (colors: SeriesColorConfig[]) => void;
    onSave: () => void;
    onCancel: () => void;
    isVisible: boolean;
    isLoading?: boolean;
}

const DEFAULT_COLORS: Record<string, { lineColor: string; pointColor: string }> = {
    "download": { lineColor: "#10b981", pointColor: "#059669" },
    "upload": { lineColor: "#f59e0b", pointColor: "#d97706" },
    "ping": { lineColor: "#ef4444", pointColor: "#dc2626" }
};

// Map simplified IDs to user-friendly display names
const SERIES_DISPLAY_NAMES: Record<string, string> = {
    "download": "Download Speed (Mbps)",
    "upload": "Upload Speed (Mbps)",
    "ping": "Ping (ms)"
};

export default function SeriesColorCustomizer({
    seriesColors,
    onColorsChange,
    onSave,
    onCancel,
    isVisible,
    isLoading = false
}: SeriesColorCustomizerProps) {
    const [hasChanges, setHasChanges] = useState(false);

    const handleColorChange = (seriesId: string, colorType: 'lineColor' | 'pointColor', newColor: string) => {
        const updatedColors = seriesColors.map(series => 
            series.seriesId === seriesId 
                ? { ...series, [colorType]: newColor }
                : series
        );
        onColorsChange(updatedColors);
        setHasChanges(true);
    };

    const handleResetToDefaults = () => {
        const resetColors = seriesColors.map(series => ({
            ...series,
            lineColor: DEFAULT_COLORS[series.seriesId]?.lineColor || '#000000',
            pointColor: DEFAULT_COLORS[series.seriesId]?.pointColor || '#000000'
        }));
        onColorsChange(resetColors);
        setHasChanges(true);
    };

    const handleSave = () => {
        onSave();
        setHasChanges(false);
    };

    const handleCancel = () => {
        onCancel();
        setHasChanges(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-foreground">
                            Customize Chart Colors
                        </h2>
                        <button
                            onClick={handleCancel}
                            className="text-muted hover:text-foreground text-2xl"
                            disabled={isLoading}
                        >
                            ×
                        </button>
                    </div>

                    <div className="space-y-6">
                        {seriesColors.map((series) => (
                            <div key={series.seriesId} className="border border-secondary/30 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-foreground mb-3">
                                    {SERIES_DISPLAY_NAMES[series.seriesId] || series.seriesId}
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <ColorPickerWidget
                                        label="Line Color"
                                        value={series.lineColor}
                                        onChange={(color) => handleColorChange(series.seriesId, 'lineColor', color)}
                                        disabled={isLoading}
                                    />
                                    
                                    <ColorPickerWidget
                                        label="Point Color"
                                        value={series.pointColor}
                                        onChange={(color) => handleColorChange(series.seriesId, 'pointColor', color)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between pt-6 mt-6 border-t border-secondary/30">
                        <button
                            onClick={handleResetToDefaults}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm text-secondary hover:text-foreground disabled:opacity-50"
                        >
                            Reset to Defaults
                        </button>
                        
                        <div className="flex space-x-3">
                        <button
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm border border-secondary/30 rounded-md text-secondary hover:bg-background/60 disabled:opacity-50"
                        >
                                Cancel
                            </button>
                            
                            <button
                                onClick={handleSave}
                                disabled={isLoading || !hasChanges}
                                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 