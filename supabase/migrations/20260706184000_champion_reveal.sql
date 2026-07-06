INSERT INTO schedule_config (type, config)
VALUES ('champion_reveal', '{"announced": false}')
ON CONFLICT (type) DO NOTHING;
