'use client';

import { useState, useEffect, useCallback } from 'react';
import { SeriesColorConfig } from '../components/SeriesColorCustomizer';

interface ChartColorsResponse {
    data: Array<{
        seriesId: string;
        lineColor: string;
        pointColor: string;
    }>;
    error: string;
}

interface ChartColorsRequest {
    colors: Array<{
        seriesId: string;
        lineColor: string;
        pointColor: string;
    }>;
}

const DEFAULT_COLORS: Record<string, { lineColor: string; pointColor: string }> = {
    "download": { lineColor: "#10b981", pointColor: "#059669" },
    "upload": { lineColor: "#f59e0b", pointColor: "#d97706" },
    "ping": { lineColor: "#ef4444", pointColor: "#dc2626" }
};

const SERIES_IDS = ["download", "upload", "ping"];

export const useChartColors = () => {
    const [seriesColors, setSeriesColors] = useState<SeriesColorConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const initializeDefaultColors = useCallback((): SeriesColorConfig[] => {
        return SERIES_IDS.map(seriesId => ({
            seriesId,
            lineColor: DEFAULT_COLORS[seriesId]?.lineColor || '#000000',
            pointColor: DEFAULT_COLORS[seriesId]?.pointColor || '#000000'
        }));
    }, []);

    const fetchColors = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch(`/api/chart-colors`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result: ChartColorsResponse = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            if (result.data && result.data.length > 0) {
                const fetchedColors: SeriesColorConfig[] = result.data.map(item => ({
                    seriesId: item.seriesId,
                    lineColor: item.lineColor,
                    pointColor: item.pointColor
                }));
                
                // Ensure all series are present, fall back to defaults if needed
                const completeColors = SERIES_IDS.map(seriesId => {
                    const found = fetchedColors.find(color => color.seriesId === seriesId);
                    return found || {
                        seriesId,
                        lineColor: DEFAULT_COLORS[seriesId]?.lineColor || '#000000',
                        pointColor: DEFAULT_COLORS[seriesId]?.pointColor || '#000000'
                    };
                });
                
                setSeriesColors(completeColors);
            } else {
                // No saved colors, use defaults
                setSeriesColors(initializeDefaultColors());
            }
        } catch (err) {
            console.error('Failed to fetch chart colors:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch colors');
            // Fall back to default colors on error
            setSeriesColors(initializeDefaultColors());
        } finally {
            setIsLoading(false);
        }
    }, [initializeDefaultColors]);

    const saveColors = useCallback(async (colors: SeriesColorConfig[]): Promise<boolean> => {
        try {
            setIsSaving(true);
            setError(null);
            
            const requestData: ChartColorsRequest = {
                colors: colors.map(color => ({
                    seriesId: color.seriesId,
                    lineColor: color.lineColor,
                    pointColor: color.pointColor
                }))
            };
            
            const response = await fetch('/api/chart-colors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            // Update local state
            setSeriesColors(colors);
            return true;
        } catch (err) {
            console.error('Failed to save chart colors:', err);
            setError(err instanceof Error ? err.message : 'Failed to save colors');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, []);

    const getColorMapping = useCallback((): Record<string, { lineColor: string; pointColor: string }> => {
        const mapping: Record<string, { lineColor: string; pointColor: string }> = {};
        seriesColors.forEach(color => {
            mapping[color.seriesId] = {
                lineColor: color.lineColor,
                pointColor: color.pointColor
            };
        });
        return mapping;
    }, [seriesColors]);

    useEffect(() => {
        fetchColors();
    }, [fetchColors]);

    return {
        seriesColors,
        setSeriesColors,
        isLoading,
        error,
        isSaving,
        saveColors,
        refetchColors: fetchColors,
        getColorMapping
    };
}; 