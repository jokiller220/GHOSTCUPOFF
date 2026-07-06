-- Update existing data
UPDATE teams SET format = '4v4' WHERE format = '5v5';
UPDATE matches SET format = '4v4' WHERE format = '5v5';
UPDATE tournament_entries SET format = '4v4' WHERE format = '5v5';

-- Update teams constraints
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_format_check;
ALTER TABLE teams ADD CONSTRAINT teams_format_check CHECK (format IN ('4v4', '1v1'));
ALTER TABLE teams ALTER COLUMN format SET DEFAULT '4v4';

-- Update matches constraints
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_format_check;
ALTER TABLE matches ADD CONSTRAINT matches_format_check CHECK (format IN ('4v4', '1v1'));

-- Update tournament_entries constraints
ALTER TABLE tournament_entries DROP CONSTRAINT IF EXISTS tournament_entries_format_check;
ALTER TABLE tournament_entries ADD CONSTRAINT tournament_entries_format_check CHECK (format IN ('4v4', '1v1'));
