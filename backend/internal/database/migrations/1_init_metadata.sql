-- Enable the uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS database_metadata
(
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version             BIGINT
);

INSERT INTO database_metadata (version)
VALUES (1);
