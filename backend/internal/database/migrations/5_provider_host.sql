ALTER TABLE schedules
ADD COLUMN host_endpoint VARCHAR(255),
ADD COLUMN host_port INT;

INSERT INTO providers (name) VALUES ('iperf3');