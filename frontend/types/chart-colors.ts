export interface ChartColorSettings {
    seriesId: string;
    lineColor: string;
    pointColor: string;
}

export interface ChartColorsRequest {
    colors: ChartColorSettings[];
}

export interface ChartColorsResponse {
    data: ChartColorSettings[];
    error: string;
}

export interface SeriesColorConfig {
    seriesId: string;
    lineColor: string;
    pointColor: string;
}

export interface ColorMapping {
    [seriesId: string]: {
        lineColor: string;
        pointColor: string;
    };
} 