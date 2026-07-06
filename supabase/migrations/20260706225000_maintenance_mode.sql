-- Add maintenance_mode column to tournament_settings
ALTER TABLE tournament_settings ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false;
