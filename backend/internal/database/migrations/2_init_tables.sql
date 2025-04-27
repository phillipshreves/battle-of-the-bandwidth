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
    provider_id     UUID,
    provider_name   VARCHAR(255),
    jitter          NUMERIC,
    upload          NUMERIC,
    download        NUMERIC,
    share           TEXT,
    raw_result      TEXT
);

CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cron_expression VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    host_endpoint VARCHAR(255),
    host_port INT,
    provider_id UUID,
    provider_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 
