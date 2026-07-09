CREATE TABLE IF NOT EXISTS ffa_score_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_name text NOT NULL,
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rank integer NOT NULL CHECK (rank > 0 AND rank <= 30),
  file_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ffa_score_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ffa_proofs_select" ON ffa_score_proofs FOR SELECT TO authenticated USING (true);
CREATE POLICY "ffa_proofs_insert" ON ffa_score_proofs FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "ffa_proofs_update" ON ffa_score_proofs FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE TABLE IF NOT EXISTS ffa_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_name text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(lobby_name)
);

ALTER TABLE ffa_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ffa_disputes_select" ON ffa_disputes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ffa_disputes_all" ON ffa_disputes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE OR REPLACE FUNCTION handle_ffa_proof_submission(
  p_lobby_name text,
  p_submitted_by uuid,
  p_rank integer,
  p_file_url text,
  p_player_count integer DEFAULT 0
)
RETURNS void AS $$
DECLARE
  v_conflict record;
  v_proofs_count integer;
  r record;
  points_to_add integer;
BEGIN
  -- Insert the proof (upsert if they resubmit)
  INSERT INTO ffa_score_proofs (lobby_name, submitted_by, rank, file_url, status)
  VALUES (p_lobby_name, p_submitted_by, p_rank, p_file_url, 'pending');

  -- Check if there's another pending proof with the SAME rank in the SAME lobby
  SELECT * INTO v_conflict 
  FROM ffa_score_proofs
  WHERE lobby_name = p_lobby_name
    AND rank = p_rank
    AND submitted_by != p_submitted_by
    AND status = 'pending'
  LIMIT 1;

  IF FOUND THEN
    -- Trigger dispute
    INSERT INTO ffa_disputes (lobby_name, status)
    VALUES (p_lobby_name, 'open')
    ON CONFLICT (lobby_name) DO UPDATE SET status = 'open';
  ELSE
    -- Check if we have received proofs for everyone in the lobby without dispute
    IF p_player_count > 0 THEN
      SELECT count(*) INTO v_proofs_count
      FROM ffa_score_proofs
      WHERE lobby_name = p_lobby_name AND status = 'pending';

      IF v_proofs_count >= p_player_count THEN
        -- Check again that NO two players have the same rank
        IF NOT EXISTS (
          SELECT rank, count(*) 
          FROM ffa_score_proofs 
          WHERE lobby_name = p_lobby_name AND status = 'pending'
          GROUP BY rank 
          HAVING count(*) > 1
        ) THEN
          -- Auto-validate the lobby
          UPDATE ffa_score_proofs SET status = 'approved' WHERE lobby_name = p_lobby_name AND status = 'pending';
          -- No 'completed' status on lobbies because lobbies are virtual (stored in json)
          
          -- Distribute points
          FOR r IN SELECT submitted_by, rank FROM ffa_score_proofs WHERE lobby_name = p_lobby_name AND status = 'approved'
          LOOP
            IF r.rank = 1 THEN points_to_add := 5;
            ELSIF r.rank = 2 THEN points_to_add := 3;
            ELSIF r.rank = 3 THEN points_to_add := 2;
            ELSIF r.rank = 4 THEN points_to_add := 1;
            ELSE points_to_add := 0;
            END IF;

            UPDATE tournament_entries 
            SET solo_points = COALESCE(solo_points, 0) + points_to_add 
            WHERE profile_id = r.submitted_by;
          END LOOP;
        END IF;
      END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
