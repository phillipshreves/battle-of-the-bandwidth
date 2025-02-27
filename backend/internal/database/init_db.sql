-- Enable the uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS speedtest_results
(
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp       TIMESTAMPTZ,
    server_name     TEXT,
    server_url      TEXT,
    client_ip       TEXT,
    client_hostname TEXT,
    client_city     TEXT,
    client_region   TEXT,
    client_country  TEXT,
    client_loc      TEXT,
    client_org      TEXT,
    client_postal   TEXT,
    client_timezone TEXT,
    bytes_sent      BIGINT,
    bytes_received  BIGINT,
    ping            NUMERIC,
    jitter          NUMERIC,
    upload          NUMERIC,
    download        NUMERIC,
    share           TEXT
);

CREATE TABLE IF NOT EXISTS user_settings
(
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    speedtest_frequency INTEGER NOT NULL, -- Frequency in minutes
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS database_metadata
(
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version             BIGINT
);

-- Insert default settings
INSERT INTO user_settings (speedtest_frequency, updated_at)
VALUES (1440, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO database_metadata (version)
VALUES (1)
ON CONFLICT DO NOTHING;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
