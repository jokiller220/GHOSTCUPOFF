import { useEffect, useState } from 'react';
import { Users, Users2, Swords, Clock, ChevronRight, RefreshCw, CheckCircle, AlertCircle, UserPlus, Calendar, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match, ActivityLog, Page, ScoreProof } from '../types';
import { AdminSettingsModal } from '../components/AdminSettingsModal';

interface AdminDashboardProps {
  onNavigate: (page: Page, data?: unknown) => void;
}

interface DashboardStats {
  players: number;
  teams: number;
  matchesPlayed: number;
  matchesPending: number;
  availableSlots: number;
  proofsPending: number;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div className="card p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className={`font-barlow font-black text-2xl md:text-4xl leading-none mb-2 ${color}`}>{value}</p>
          <p className="text-ghost-gray text-[10px] md:text-xs font-barlow uppercase tracking-widest">{label}</p>
        </div>
        <span className={`${color} opacity-40 hidden sm:block`}>{icon}</span>
      </div>
    </div>
  );
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  score_validated: <CheckCircle size={14} className="text-ghost-green" />,
  new_player: <UserPlus size={14} className="text-ghost-gold" />,
  match_scheduled: <Calendar size={14} className="text-white" />,
  proof_submitted: <AlertCircle size={14} className="text-ghost-gold" />,
};

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({ players: 0, teams: 0, matchesPlayed: 0, matchesPending: 0, availableSlots: 24, proofsPending: 0 });
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [pendingProofs, setPendingProofs] = useState<ScoreProof[]>([]);
  const [_activeBracketMatches, setActiveBracketMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    // Stats
    const [
      { data: settings },
      { count: playerCount },
      { count: teamCount },
      { count: playedCount },
      { count: pendingCount },
      { count: proofsPendingCount },
    ] = await Promise.all([
      supabase.from('tournament_settings').select('max_players').single(),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'player'),
      supabase.from('teams').select('*', { count: 'exact', head: true }),
      supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('matches').select('*', { count: 'exact', head: true }).in('status', ['scheduled', 'live']),
      supabase.from('score_proofs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    const players = playerCount ?? 0;
    const maxPlayers = settings?.max_players ?? 28;
    setStats({
      players,
      teams: teamCount ?? 0,
      matchesPlayed: playedCount ?? 0,
      matchesPending: pendingCount ?? 0,
      proofsPending: proofsPendingCount ?? 0,
      availableSlots: Math.max(0, maxPlayers - players),
    });

    // Activity logs
    const { data: logs } = await supabase
      .from('activity_logs')
      .select('*, admin:profiles(cod_username)')
      .order('created_at', { ascending: false })
      .limit(8);
    setRecentActivity((logs as ActivityLog[]) ?? []);

    // Active bracket matches
    const { data: activeMatches } = await supabase
      .from('matches')
      .select('*, team1:profiles!matches_team1_id_fkey(cod_username, seed_rank), team2:profiles!matches_team2_id_fkey(cod_username, seed_rank)')
      .eq('format', '1v1')
      .in('status', ['live', 'scheduled'])
      .order('round_order', { ascending: false })
      .limit(2);
    const { data: proofs } = await supabase
      .from('score_proofs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(6);
    setPendingProofs((proofs as ScoreProof[]) ?? []);
    setActiveBracketMatches((activeMatches as Match[]) ?? []);

    setLoading(false);
  }

  const activity = recentActivity;

  function formatTime(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs}h`;
    return new Date(d).toLocaleDateString('fr-FR');
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="section-title">GHOST CUP ADMIN</p>
          <h1 className="font-barlow font-black text-2xl md:text-3xl text-white uppercase">TABLEAU DE BORD</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)} className="btn-outline text-xs py-2 px-4 flex items-center gap-2">
            <Settings size={12} /> PARAMÈTRES
          </button>
          <button onClick={load} disabled={loading} className="btn-outline text-xs py-2 px-4 flex items-center gap-2">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> ACTUALISER
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <StatCard icon={<Users size={28} />} label="Joueurs inscrits" value={stats.players} color="text-white" />
        <StatCard icon={<Users2 size={28} />} label="Équipes (4VS4)" value={stats.teams} color="text-ghost-gold" />
        <StatCard icon={<Swords size={28} />} label="Places restantes" value={stats.availableSlots} color="text-ghost-green" />
        <StatCard icon={<Clock size={28} />} label="Preuves en attente" value={stats.proofsPending} color="text-ghost-red" />
        <StatCard icon={<Clock size={28} />} label="Matchs à venir/en cours" value={stats.matchesPending} color="text-ghost-red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Activity */}
        <div className="lg:col-span-2">
          <p className="section-title mb-4">ACTIVITÉ RÉCENTE</p>
          <div className="space-y-2">
            {activity.length > 0 ? (
              activity.map(log => (
                <div key={log.id} className="card px-4 py-3 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {ACTIVITY_ICONS[log.action] ?? <Clock size={14} className="text-ghost-gray" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-xs font-barlow font-bold">
                      {(log.details as Record<string, string>)?.desc ?? log.action}
                    </p>
                    <p className="text-ghost-gray text-[10px] mt-0.5">{formatTime(log.created_at)}</p>
                  </div>
                  <span className={`text-[9px] font-barlow font-bold uppercase px-2 py-0.5 border ${
                    log.action === 'score_validated' ? 'text-ghost-green border-ghost-green/40' :
                    log.action === 'new_player' ? 'text-ghost-gold border-ghost-gold/40' :
                    'text-ghost-gray border-ghost-border'
                  }`}>
                    {log.action === 'score_validated' ? '4v4' :
                     log.action === 'new_player' ? '1v1' : '4v4'}
                  </span>
                </div>
              ))
            ) : (
              <div className="card px-4 py-6 text-center text-ghost-gray text-xs font-barlow">
                Aucune activité récente.
              </div>
            )}
          </div>
        </div>

        {/* Brackets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">PHASE FINALE 1v1</p>
          </div>

          {/* Top qualifiés */}
          {_activeBracketMatches.length > 0 ? (
            _activeBracketMatches.map(match => (
              <div key={match.id} className="card p-4 mb-3 hover:border-ghost-gold/20 transition-all cursor-pointer" onClick={() => onNavigate('admin-brackets')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-barlow font-black text-ghost-gold text-xs uppercase tracking-wider">
                    {match.round_order === 1 ? '1/8 FINALE' : match.round_order === 2 ? '1/4 FINALE' : match.round_order === 3 ? '1/2 FINALE' : 'FINALE'}
                  </span>
                  <span className="text-ghost-gray text-[10px] font-barlow">1v1 BO{match.best_of}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-ghost-green" />
                      <span className="text-white text-xs font-barlow">
                        {(match.team1 as any)?.cod_username ?? 'TBD'} 
                        <span className="text-ghost-gray"> ({(match.team1 as any)?.seed_rank ? `#${(match.team1 as any).seed_rank}` : 'TBD'})</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-ghost-gold" />
                      <span className="text-white text-xs font-barlow">
                        {(match.team2 as any)?.cod_username ?? 'TBD'} 
                        <span className="text-ghost-gray"> ({(match.team2 as any)?.seed_rank ? `#${(match.team2 as any).seed_rank}` : 'TBD'})</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card px-4 py-6 text-center text-ghost-gray text-xs font-barlow mb-4">
              Aucun match de phase finale actif.
            </div>
          )}

          <button onClick={() => onNavigate('admin-brackets')} className="btn-gold w-full text-xs py-2.5 flex items-center justify-center gap-2">
            VOIR LES BRACKETS <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 md:mt-8">
        <p className="section-title mb-4">ACTIONS RAPIDES</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {[
            { label: 'Gérer les matchs', page: 'admin-matchs' as Page, color: 'btn-gold' },
            { label: 'Joueurs & Équipes', page: 'admin-joueurs' as Page, color: 'btn-dark' },
            { label: 'Brackets', page: 'admin-brackets' as Page, color: 'btn-dark' },
            { label: 'Annonces', page: 'admin-annonces' as Page, color: 'btn-dark' },
            { label: 'Horaires', page: 'admin-planning' as Page, color: 'btn-outline' },
          ].map(({ label, page, color }) => (
            <button key={page} onClick={() => onNavigate(page)} className={`${color} text-xs py-3 w-full`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 lg:mt-0">
        <p className="section-title mb-4">PREUVES EN ATTENTE</p>
        <div className="space-y-3">
          {pendingProofs.length > 0 ? (
            pendingProofs.map(proof => (
              <div key={proof.id} className="card p-4 bg-slate-950/50 border border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white font-semibold">Match ID: {proof.match_id}</p>
                    <p className="text-ghost-gray text-xs">Soumis par : {proof.submitted_by}</p>
                  </div>
                  <span className="text-ghost-gold text-[11px] uppercase tracking-widest">{proof.status}</span>
                </div>
                <a href={proof.file_url} target="_blank" rel="noreferrer" className="mt-3 block text-ghost-gold text-xs underline">
                  Voir la preuve
                </a>
              </div>
            ))
          ) : (
            <div className="card p-4 text-ghost-gray">Aucune preuve en attente pour le moment.</div>
          )}
        </div>
      </div>

      {showSettings && (
        <AdminSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
