ALTER TABLE score_proofs
ADD COLUMN IF NOT EXISTS team1_score integer,
ADD COLUMN IF NOT EXISTS team2_score integer,
ADD COLUMN IF NOT EXISTS team_side text;

CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disputes_select" ON disputes;
CREATE POLICY "disputes_select" ON disputes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "disputes_all" ON disputes;
CREATE POLICY "disputes_all" ON disputes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION handle_proof_submission(
  p_match_id uuid,
  p_submitted_by uuid,
  p_file_url text,
  p_comment text,
  p_team1_score integer,
  p_team2_score integer,
  p_team_side text
)
RETURNS void AS $$
DECLARE
  v_other_proof record;
BEGIN
  -- Insert the new proof
  INSERT INTO score_proofs (match_id, submitted_by, file_url, comment, status, team1_score, team2_score, team_side)
  VALUES (p_match_id, p_submitted_by, p_file_url, p_comment, 'pending', p_team1_score, p_team2_score, p_team_side);

  -- Check if opponent already submitted a proof
  SELECT * INTO v_other_proof 
  FROM score_proofs 
  WHERE match_id = p_match_id 
    AND team_side != p_team_side
  ORDER BY created_at DESC 
  LIMIT 1;

  IF FOUND THEN
    IF v_other_proof.team1_score = p_team1_score AND v_other_proof.team2_score = p_team2_score THEN
      -- Scores match! Auto-validate
      UPDATE matches SET status = 'completed' WHERE id = p_match_id;
      UPDATE score_proofs SET status = 'approved' WHERE match_id = p_match_id;
      
      -- Insert score
      INSERT INTO match_scores (match_id, manche_number, team1_score, team2_score)
      VALUES (p_match_id, 1, p_team1_score, p_team2_score)
      ON CONFLICT (match_id, manche_number) DO UPDATE
      SET team1_score = EXCLUDED.team1_score, team2_score = EXCLUDED.team2_score;
    ELSE
      -- Scores mismatch! Create dispute
      INSERT INTO disputes (match_id, status) VALUES (p_match_id, 'open');
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auto_validate_old_proofs()
RETURNS void AS $$
DECLARE
  r record;
BEGIN
  -- Find pending proofs older than 30 minutes with no opposing proof and no open dispute
  FOR r IN 
    SELECT p.id, p.match_id, p.team1_score, p.team2_score
    FROM score_proofs p
    WHERE p.status = 'pending'
      AND p.created_at < now() - interval '30 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM score_proofs p2 
        WHERE p2.match_id = p.match_id AND p2.team_side != p.team_side
      )
      AND NOT EXISTS (
        SELECT 1 FROM disputes d 
        WHERE d.match_id = p.match_id AND d.status = 'open'
      )
  LOOP
    UPDATE matches SET status = 'completed' WHERE id = r.match_id;
    UPDATE score_proofs SET status = 'approved' WHERE match_id = r.match_id;
    
    INSERT INTO match_scores (match_id, manche_number, team1_score, team2_score)
    VALUES (r.match_id, 1, r.team1_score, r.team2_score)
    ON CONFLICT (match_id, manche_number) DO UPDATE
    SET team1_score = EXCLUDED.team1_score, team2_score = EXCLUDED.team2_score;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
