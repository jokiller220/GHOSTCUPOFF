-- Create the reset_tournament stored procedure
CREATE OR REPLACE FUNCTION reset_tournament()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the function creator (usually superuser)
AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accès refusé. Seuls les administrateurs peuvent réinitialiser le tournoi.';
  END IF;

  -- Delete data in the correct order to respect foreign key constraints
  DELETE FROM score_proofs;
  DELETE FROM match_scores;
  DELETE FROM matches;
  DELETE FROM tournament_entries;
  DELETE FROM team_members;
  DELETE FROM teams;
  
  -- Optionally, clear the schedule config if we want to reset brackets completely
  DELETE FROM schedule_config;

  -- Log the action
  INSERT INTO activity_logs (admin_id, action, details)
  VALUES (
    auth.uid(), 
    'RÉINITIALISATION', 
    '{"message": "Toutes les données du tournoi (équipes, matchs, brackets, scores) ont été effacées pour une nouvelle saison."}'::jsonb
  );
END;
$$;
