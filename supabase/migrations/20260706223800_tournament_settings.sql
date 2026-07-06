CREATE TABLE IF NOT EXISTS tournament_settings (
  id integer PRIMARY KEY DEFAULT 1,
  start_date timestamptz NOT NULL,
  final_date timestamptz NOT NULL,
  max_players integer NOT NULL DEFAULT 28
);

-- Insert default settings
INSERT INTO tournament_settings (id, start_date, final_date, max_players)
VALUES (1, '2026-07-08T00:00:00Z', '2026-07-15T20:00:00Z', 28)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE tournament_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
DROP POLICY IF EXISTS "settings_select" ON tournament_settings;
CREATE POLICY "settings_select" ON tournament_settings FOR SELECT TO anon, authenticated USING (true);

-- Only admins can update settings
DROP POLICY IF EXISTS "settings_update" ON tournament_settings;
CREATE POLICY "settings_update" ON tournament_settings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
