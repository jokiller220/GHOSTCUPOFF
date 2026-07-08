export type Format = '4v4' | '1v1';

export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'forfeit' | 'postponed';

export type TeamStatus = 'forming' | 'registered' | 'active' | 'eliminated' | 'champion';

export type MemberStatus = 'pending' | 'active' | 'kicked';

export type ProofStatus = 'pending' | 'approved' | 'rejected';

export type NotifType = 'info' | 'match' | 'result' | 'warning' | 'announcement';

export interface Profile {
  id: string;
  cod_username: string;
  real_name: string;
  role: 'player' | 'admin';
  avatar_url?: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  captain_id: string;
  format: Format;
  status: TeamStatus;
  invite_code: string;
  logo_url?: string;
  created_at: string;
  captain?: Profile;
  members?: TeamMember[];
}

export interface TournamentSettings {
  id: number;
  start_date: string;
  final_date: string;
  max_players: number;
  maintenance_mode: boolean;
}

export interface TeamMember {
  id: string;
  team_id: string;
  profile_id: string;
  status: MemberStatus;
  joined_at: string;
  profile?: Profile;
}

export interface Match {
  id: string;
  format: Format;
  round_name: string;
  round_order: number;
  match_order: number;
  team1_id?: string;
  team2_id?: string;
  team1_name?: string;
  team2_name?: string;
  winner_id?: string | null;
  status: MatchStatus;
  scheduled_at?: string | null;
  map?: string | null;
  mode?: string | null;
  admin_notes?: string | null;
  next_match_id?: string | null;
  created_at: string;
  scores?: MatchScore[];
  team1?: Team;
  team2?: Team;
}

export interface MatchScore {
  id: string;
  match_id: string;
  manche_number: number;
  team1_score: number;
  team2_score: number;
  created_at: string;
}

export interface ScoreProof {
  id: string;
  match_id: string;
  submitted_by: string;
  file_url: string;
  comment?: string;
  status: ProofStatus;
  created_at: string;
  profile?: Profile;
}

export interface Notification {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  type: NotifType;
  read: boolean;
  created_at: string;
}

export interface PublicAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'match' | 'info' | 'warning';
  created_at: string;
}

export interface TournamentEntry {
  id: string;
  format: Format;
  team_id?: string;
  profile_id?: string;
  status: 'registered' | 'active' | 'qualified' | 'eliminated';
  seed?: number;
  team_points: number;
  solo_points: number;
  total_points: number;
  qualified: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  admin_id?: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  admin?: Profile;
}

export type Page =
  | 'home'
  | 'reglement'
  | 'recompenses'
  | 'bracket'
  | 'planning'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'mes-matchs'
  | 'mon-equipe'
  | 'notifications'
  | 'parametres'
  | 'match-detail'
  | 'preuve-score'
  | 'admin'
  | 'admin-matchs'
  | 'admin-joueurs'
  | 'admin-brackets'
  | 'admin-match-detail'
  | 'admin-planning'
  | 'admin-ffa'
  | 'admin-player-detail';

export interface ScheduleConfig {
  id: string;
  type: 'round_robin' | 'ffa' | 'bracket';
  config: any;
  updated_at: string;
}
