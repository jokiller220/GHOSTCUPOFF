-- Drop foreign key constraints on team1_id, team2_id, and winner_id
-- This allows these columns to store EITHER team IDs (for 4v4) OR profile IDs (for 1v1 Bracket)

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team1_id_fkey;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team2_id_fkey;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_winner_id_fkey;
