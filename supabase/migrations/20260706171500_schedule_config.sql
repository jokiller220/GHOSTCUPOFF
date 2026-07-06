CREATE TABLE IF NOT EXISTS schedule_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE CHECK (type IN ('round_robin', 'ffa', 'bracket')),
  config jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE schedule_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedule_config_select" ON schedule_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "schedule_config_all" ON schedule_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO schedule_config (type, config) VALUES 
('round_robin', '{"dates": [{"date": "2026-07-09", "time": "21:00"}, {"date": "2026-07-09", "time": "21:45"}, {"date": "2026-07-09", "time": "22:30"}, {"date": "2026-07-10", "time": "21:00"}, {"date": "2026-07-10", "time": "21:45"}]}'::jsonb),
('ffa', '{"dates": [{"date": "2026-07-11", "time": "21:00"}, {"date": "2026-07-11", "time": "21:30"}, {"date": "2026-07-11", "time": "22:00"}, {"date": "2026-07-11", "time": "22:30"}]}'::jsonb),
('bracket', '{"dates": [{"date": "2026-07-12", "times": ["18:00", "19:30", "21:00", "22:30"]}, {"date": "2026-07-13", "times": ["18:00", "19:30", "21:00", "22:30"]}, {"date": "2026-07-14", "times": ["18:00", "19:30"]}, {"date": "2026-07-15", "times": ["20:00"]}]}'::jsonb);
