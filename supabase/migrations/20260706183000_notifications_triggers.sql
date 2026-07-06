-- Trigger for new disputes
CREATE OR REPLACE FUNCTION notify_on_dispute()
RETURNS TRIGGER AS $$
DECLARE
  v_team1_id UUID;
  v_team2_id UUID;
  v_profile_id UUID;
BEGIN
  -- Get match details
  SELECT team1_id, team2_id INTO v_team1_id, v_team2_id
  FROM matches
  WHERE id = NEW.match_id;

  -- Notify team 1 members
  FOR v_profile_id IN SELECT profile_id FROM team_members WHERE team_id = v_team1_id AND status = 'active' LOOP
    INSERT INTO notifications (profile_id, type, title, message)
    VALUES (v_profile_id, 'match', 'Litige ouvert', 'Un litige a été ouvert pour votre match. Les scores soumis sont discordants.');
  END LOOP;

  -- Notify team 2 members
  FOR v_profile_id IN SELECT profile_id FROM team_members WHERE team_id = v_team2_id AND status = 'active' LOOP
    INSERT INTO notifications (profile_id, type, title, message)
    VALUES (v_profile_id, 'match', 'Litige ouvert', 'Un litige a été ouvert pour votre match. Les scores soumis sont discordants.');
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_on_dispute ON disputes;
CREATE TRIGGER tr_notify_on_dispute
  AFTER INSERT ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_dispute();

-- Function to check and send 30 min reminders
CREATE OR REPLACE FUNCTION check_match_reminders()
RETURNS void AS $$
DECLARE
  v_match RECORD;
  v_profile_id UUID;
BEGIN
  FOR v_match IN
    SELECT id, team1_id, team2_id, format, round_name, scheduled_at
    FROM matches
    WHERE status = 'scheduled'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now() + interval '30 minutes'
      AND scheduled_at > now()
      AND id NOT IN (
        SELECT (details->>'match_id')::UUID 
        FROM activity_logs 
        WHERE action = 'match_reminder'
      )
  LOOP
    -- Notify team 1
    IF v_match.team1_id IS NOT NULL THEN
      FOR v_profile_id IN SELECT profile_id FROM team_members WHERE team_id = v_match.team1_id AND status = 'active' LOOP
        INSERT INTO notifications (profile_id, type, title, message)
        VALUES (v_profile_id, 'match', 'Rappel Match', 'Votre match ' || v_match.round_name || ' commence dans moins de 30 minutes.');
      END LOOP;
    END IF;

    -- Notify team 2
    IF v_match.team2_id IS NOT NULL THEN
      FOR v_profile_id IN SELECT profile_id FROM team_members WHERE team_id = v_match.team2_id AND status = 'active' LOOP
        INSERT INTO notifications (profile_id, type, title, message)
        VALUES (v_profile_id, 'match', 'Rappel Match', 'Votre match ' || v_match.round_name || ' commence dans moins de 30 minutes.');
      END LOOP;
    END IF;

    -- Log to prevent duplicate reminders
    INSERT INTO activity_logs (action, admin_id, details)
    VALUES ('match_reminder', NULL, jsonb_build_object('match_id', v_match.id));
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
