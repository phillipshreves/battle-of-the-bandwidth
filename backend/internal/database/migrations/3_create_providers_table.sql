CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL
);

INSERT INTO providers (name) VALUES ('librespeed');
INSERT INTO providers (name) VALUES ('cloudflare');

ALTER TABLE speedtest_results
ADD COLUMN provider_id UUID,
ADD COLUMN provider_name VARCHAR(255);

-- Update existing records to link with librespeed provider (as it was the default before)
WITH librespeed_provider AS (
    SELECT id FROM providers WHERE name = 'librespeed'
)
UPDATE speedtest_results
SET provider_id = (SELECT id FROM librespeed_provider),
    provider_name = 'librespeed'
WHERE provider_id IS NULL; 