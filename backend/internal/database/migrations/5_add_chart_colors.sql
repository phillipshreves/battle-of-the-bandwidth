CREATE TABLE IF NOT EXISTS chart_colors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id VARCHAR(100) NOT NULL, -- e.g., "Download Speed (Mbps)", "Upload Speed (Mbps)", "Ping (ms)"
    line_color VARCHAR(7) NOT NULL, -- hex color code like #FF5733
    point_color VARCHAR(7) NOT NULL, -- hex color code like #FF5733
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
); 