CREATE OR REPLACE FUNCTION update_total_points()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_points = COALESCE(NEW.team_points, 0) + COALESCE(NEW.solo_points, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_total_points ON tournament_entries;
CREATE TRIGGER tr_update_total_points
BEFORE INSERT OR UPDATE OF team_points, solo_points ON tournament_entries
FOR EACH ROW EXECUTE FUNCTION update_total_points();

CREATE OR REPLACE FUNCTION submit_ffa_lobby_results(rankings jsonb)
RETURNS void AS $$
DECLARE
  r record;
  points_to_add integer;
BEGIN
  FOR r IN SELECT * FROM jsonb_to_recordset(rankings) AS x(profile_id uuid, rank integer)
  LOOP
    IF r.rank = 1 THEN points_to_add := 5;
    ELSIF r.rank = 2 THEN points_to_add := 3;
    ELSIF r.rank = 3 THEN points_to_add := 2;
    ELSIF r.rank = 4 THEN points_to_add := 1;
    ELSE points_to_add := 0;
    END IF;

    UPDATE tournament_entries 
    SET solo_points = solo_points + points_to_add 
    WHERE profile_id = r.profile_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
