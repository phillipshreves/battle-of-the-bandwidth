ALTER TABLE schedules ADD COLUMN result_limit INTEGER NOT NULL DEFAULT 0;
COMMENT ON COLUMN schedules.result_limit IS 'Maximum number of results to keep for this schedule. 0 means no limit.';

ALTER TABLE speedtest_results ADD COLUMN schedule_id UUID;