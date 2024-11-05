CREATE TABLE IF NOT EXISTS speedtest_results
(
    id              SERIAL PRIMARY KEY,
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
