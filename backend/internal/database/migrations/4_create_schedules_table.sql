CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    provider_id UUID,
		provider_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 

WITH librespeed_provider AS (
    SELECT id FROM providers WHERE name = 'librespeed'
)
INSERT INTO schedules (name, cron_expression, is_active, provider_id, provider_name) 
VALUES ('Daily Test', '0 0 * * *', true, (SELECT id FROM librespeed_provider), 'librespeed');