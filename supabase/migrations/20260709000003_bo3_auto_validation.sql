-- Ajouter la colonne JSONB pour stocker les détails des manches
ALTER TABLE score_proofs
ADD COLUMN IF NOT EXISTS rounds jsonb DEFAULT '[]'::jsonb;

-- Supprimer l'ancienne fonction car la signature change
DROP FUNCTION IF EXISTS handle_proof_submission(uuid, uuid, text, text, integer, integer, text);

-- Créer la nouvelle fonction
CREATE OR REPLACE FUNCTION handle_proof_submission(
  p_match_id uuid,
  p_submitted_by uuid,
  p_file_url text,
  p_comment text,
  p_team1_score integer,
  p_team2_score integer,
  p_team_side text,
  p_rounds jsonb DEFAULT '[]'::jsonb
)
RETURNS void AS $$
DECLARE
  v_other_proof record;
  r record;
BEGIN
  -- Insert the new proof
  INSERT INTO score_proofs (match_id, submitted_by, file_url, comment, status, team1_score, team2_score, team_side, rounds)
  VALUES (p_match_id, p_submitted_by, p_file_url, p_comment, 'pending', p_team1_score, p_team2_score, p_team_side, p_rounds);

  -- Check if opponent already submitted a proof
  SELECT * INTO v_other_proof 
  FROM score_proofs 
  WHERE match_id = p_match_id 
    AND team_side != p_team_side
  ORDER BY created_at DESC 
  LIMIT 1;

  IF FOUND THEN
    -- Check if both overall scores match AND the round arrays match
    IF v_other_proof.team1_score = p_team1_score AND v_other_proof.team2_score = p_team2_score AND v_other_proof.rounds = p_rounds THEN
      -- Scores match! Auto-validate
      UPDATE matches SET status = 'completed' WHERE id = p_match_id;
      UPDATE score_proofs SET status = 'approved' WHERE match_id = p_match_id;
      
      -- Insert scores for each round
      FOR r IN SELECT * FROM jsonb_array_elements(p_rounds)
      LOOP
        INSERT INTO match_scores (match_id, manche_number, team1_score, team2_score)
        VALUES (
          p_match_id, 
          (r.value->>'manche')::integer, 
          (r.value->>'t1')::integer, 
          (r.value->>'t2')::integer
        )
        ON CONFLICT (match_id, manche_number) DO UPDATE
        SET team1_score = EXCLUDED.team1_score, team2_score = EXCLUDED.team2_score;
      END LOOP;

      -- Attribute points to players based on the overall score
      DECLARE
        v_t1_points integer := 0;
        v_t2_points integer := 0;
        v_match_record record;
      BEGIN
        IF p_team1_score > p_team2_score THEN
          IF (p_team1_score - p_team2_score) >= 2 THEN
            v_t1_points := 3;
            v_t2_points := 0;
          ELSE
            v_t1_points := 2;
            v_t2_points := 1;
          END IF;
        ELSIF p_team2_score > p_team1_score THEN
          IF (p_team2_score - p_team1_score) >= 2 THEN
            v_t1_points := 0;
            v_t2_points := 3;
          ELSE
            v_t1_points := 1;
            v_t2_points := 2;
          END IF;
        END IF;

        SELECT * INTO v_match_record FROM matches WHERE id = p_match_id;

        IF v_match_record.format != '1v1' AND v_match_record.team1_id IS NOT NULL AND v_match_record.team2_id IS NOT NULL THEN
          UPDATE profiles p
          SET points = COALESCE(p.points, 0) + v_t1_points
          FROM team_members tm
          WHERE tm.profile_id = p.id
            AND tm.team_id = v_match_record.team1_id
            AND tm.status = 'active';

          UPDATE profiles p
          SET points = COALESCE(p.points, 0) + v_t2_points
          FROM team_members tm
          WHERE tm.profile_id = p.id
            AND tm.team_id = v_match_record.team2_id
            AND tm.status = 'active';
        END IF;
      END;
    ELSE
      -- Scores mismatch! Create dispute
      INSERT INTO disputes (match_id, status) VALUES (p_match_id, 'open');
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
