
/*
# Ghost Cup – Initial Schema

## Overview
Tournament management platform for Call of Duty Ghost Cup, supporting 5v5 and 1v1 formats.
All tables are multi-user, authenticated via Supabase Auth.

## New Tables

### profiles
Extends auth.users with COD-specific fields.
- id: UUID (FK to auth.users)
- cod_username: COD in-game name
- real_name: player's real first name
- role: 'player' | 'admin'
- created_at

### teams
5v5 teams. Captain is a profile reference.
- id, name, captain_id, format ('5v5' | '1v1'), status, invite_code, created_at

### team_members
Membership table linking profiles to teams.
- id, team_id, profile_id, status ('pending' | 'active' | 'kicked'), joined_at

### tournament_entries
Tracks individual players registered for 1v1, or teams registered for 5v5.
- id, format, team_id (nullable, for 5v5), profile_id (nullable, for 1v1), status, seed, created_at

### matches
Each match in the bracket.
- id, format, round_name, round_order, match_order, team1_id, team2_id, winner_id, status, scheduled_at, next_match_id

### match_scores
Individual rounds (manches) within a best-of-5 match.
- id, match_id, manche_number, team1_score, team2_score, created_at

### score_proofs
Screenshot/clip submissions per match.
- id, match_id, submitted_by, file_url, comment, status ('pending' | 'approved' | 'rejected'), created_at

### notifications
In-app notifications per player.
- id, profile_id, title, message, type, read, created_at

### activity_logs
Admin audit trail.
- id, admin_id, action, details (jsonb), created_at

## Security
RLS enabled on all tables. Players can read their own data; admins bypass via service key.
Public bracket/match data readable by all authenticated users (and anon for public pages).
*/

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cod_username text UNIQUE NOT NULL,
  real_name text NOT NULL,
  role text NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  captain_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  format text NOT NULL DEFAULT '5v5' CHECK (format IN ('5v5', '1v1')),
  status text NOT NULL DEFAULT 'forming' CHECK (status IN ('forming', 'registered', 'active', 'eliminated', 'champion')),
  invite_code text UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  logo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "teams_insert" ON teams;
CREATE POLICY "teams_insert" ON teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = captain_id);

DROP POLICY IF EXISTS "teams_update" ON teams;
CREATE POLICY "teams_update" ON teams FOR UPDATE TO authenticated USING (auth.uid() = captain_id) WITH CHECK (auth.uid() = captain_id);

DROP POLICY IF EXISTS "teams_delete" ON teams;
CREATE POLICY "teams_delete" ON teams FOR DELETE TO authenticated USING (auth.uid() = captain_id);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'kicked')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE (team_id, profile_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select" ON team_members;
CREATE POLICY "team_members_select" ON team_members FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "team_members_insert" ON team_members;
CREATE POLICY "team_members_insert" ON team_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = profile_id OR
    EXISTS (SELECT 1 FROM teams WHERE teams.id = team_id AND teams.captain_id = auth.uid())
  );

DROP POLICY IF EXISTS "team_members_update" ON team_members;
CREATE POLICY "team_members_update" ON team_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM teams WHERE teams.id = team_id AND teams.captain_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM teams WHERE teams.id = team_id AND teams.captain_id = auth.uid()));

DROP POLICY IF EXISTS "team_members_delete" ON team_members;
CREATE POLICY "team_members_delete" ON team_members FOR DELETE TO authenticated
  USING (
    auth.uid() = profile_id OR
    EXISTS (SELECT 1 FROM teams WHERE teams.id = team_id AND teams.captain_id = auth.uid())
  );

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  format text NOT NULL CHECK (format IN ('5v5', '1v1')),
  round_name text NOT NULL,
  round_order integer NOT NULL DEFAULT 0,
  match_order integer NOT NULL DEFAULT 0,
  team1_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  team2_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  team1_name text,
  team2_name text,
  winner_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'forfeit', 'postponed')),
  scheduled_at timestamptz,
  map text,
  mode text,
  admin_notes text,
  next_match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_select" ON matches;
CREATE POLICY "matches_select" ON matches FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "matches_insert" ON matches;
CREATE POLICY "matches_insert" ON matches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "matches_update" ON matches;
CREATE POLICY "matches_update" ON matches FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "matches_delete" ON matches;
CREATE POLICY "matches_delete" ON matches FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Match Scores
CREATE TABLE IF NOT EXISTS match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  manche_number integer NOT NULL,
  team1_score integer DEFAULT 0,
  team2_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (match_id, manche_number)
);

ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_scores_select" ON match_scores;
CREATE POLICY "match_scores_select" ON match_scores FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "match_scores_insert" ON match_scores;
CREATE POLICY "match_scores_insert" ON match_scores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "match_scores_update" ON match_scores;
CREATE POLICY "match_scores_update" ON match_scores FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "match_scores_delete" ON match_scores;
CREATE POLICY "match_scores_delete" ON match_scores FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Score Proofs
CREATE TABLE IF NOT EXISTS score_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  comment text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE score_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "score_proofs_select" ON score_proofs;
CREATE POLICY "score_proofs_select" ON score_proofs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "score_proofs_insert" ON score_proofs;
CREATE POLICY "score_proofs_insert" ON score_proofs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "score_proofs_update" ON score_proofs;
CREATE POLICY "score_proofs_update" ON score_proofs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "score_proofs_delete" ON score_proofs;
CREATE POLICY "score_proofs_delete" ON score_proofs FOR DELETE TO authenticated
  USING (auth.uid() = submitted_by OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'match', 'result', 'warning', 'announcement')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- Public announcements
CREATE TABLE IF NOT EXISTS public_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'match', 'info', 'warning')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_announcements_select" ON public_announcements;
CREATE POLICY "public_announcements_select" ON public_announcements FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_announcements_insert" ON public_announcements;
CREATE POLICY "public_announcements_insert" ON public_announcements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "public_announcements_update" ON public_announcements;
CREATE POLICY "public_announcements_update" ON public_announcements FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "public_announcements_delete" ON public_announcements;
CREATE POLICY "public_announcements_delete" ON public_announcements FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tournament entries
CREATE TABLE IF NOT EXISTS tournament_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  format text NOT NULL CHECK (format IN ('5v5', '1v1')),
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'qualified', 'eliminated')),
  seed integer,
  team_points integer NOT NULL DEFAULT 0,
  solo_points integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  qualified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (team_id, profile_id)
);

ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_entries_select" ON tournament_entries;
CREATE POLICY "tournament_entries_select" ON tournament_entries FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tournament_entries_insert" ON tournament_entries;
CREATE POLICY "tournament_entries_insert" ON tournament_entries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
    auth.uid() = profile_id
  );

DROP POLICY IF EXISTS "tournament_entries_update" ON tournament_entries;
CREATE POLICY "tournament_entries_update" ON tournament_entries FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
    auth.uid() = profile_id
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
    auth.uid() = profile_id
  );

DROP POLICY IF EXISTS "tournament_entries_delete" ON tournament_entries;
CREATE POLICY "tournament_entries_delete" ON tournament_entries FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select" ON activity_logs;
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "activity_logs_insert" ON activity_logs;
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "activity_logs_update" ON activity_logs;
CREATE POLICY "activity_logs_update" ON activity_logs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "activity_logs_delete" ON activity_logs;
CREATE POLICY "activity_logs_delete" ON activity_logs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select" ON activity_logs;
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "activity_logs_insert" ON activity_logs;
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "activity_logs_update" ON activity_logs;
CREATE POLICY "activity_logs_update" ON activity_logs FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "activity_logs_delete" ON activity_logs;
CREATE POLICY "activity_logs_delete" ON activity_logs FOR DELETE TO authenticated
  USING (false);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_profile_id ON team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_matches_format ON matches(format);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_at ON matches(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_match_scores_match_id ON match_scores(match_id);
CREATE INDEX IF NOT EXISTS idx_score_proofs_match_id ON score_proofs(match_id);
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON activity_logs(admin_id);
