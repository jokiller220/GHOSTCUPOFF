import { useEffect, useState } from 'react';
import { Swords, Clock, ChevronRight, TrendingUp, Trophy, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Match, Notification, Page } from '../types';

interface DashboardPageProps {
  onNavigate: (page: Page, data?: unknown) => void;
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="card p-3 md:p-5 flex items-center gap-3 md:gap-4 hover:border-ghost-gold/20 transition-all duration-200">
      <div className={`p-2 md:p-2.5 ${color} bg-opacity-10 rounded-sm`}>
        {icon}
      </div>
      <div>
        <p className="font-barlow font-black text-lg md:text-2xl text-white leading-none">{value}</p>
        <p className="text-ghost-gray text-[9px] md:text-[10px] uppercase tracking-widest mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { profile } = useAuth();
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({
    teamPoints: 0,
    soloPoints: 0,
    totalPoints: 0,
    rank: '-',
    status: 'registered'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  async function loadData() {
    setLoading(true);

    // Load notifications
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', profile!.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setNotifications((notifs as Notification[]) ?? []);

    // Load stats
    const { data: entry } = await supabase
      .from('tournament_entries')
      .select('*')
      .eq('profile_id', profile!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (entry) {
      setStats({
        teamPoints: entry.team_points || 0,
        soloPoints: entry.solo_points || 0,
        totalPoints: entry.total_points || 0,
        rank: entry.seed ? `#${entry.seed}` : '-',
        status: entry.status || 'registered'
      });
    }

    // Get user's teams
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('profile_id', profile!.id);
    const teamIds = teamMembers?.map(tm => tm.team_id) || [];

    if (teamIds.length > 0) {
      const { data: matches } = await supabase
        .from('matches')
        .select('*, scores:match_scores(*)')
        .in('status', ['scheduled', 'live'])
        .or(`team1_id.in.(${teamIds.join(',')}),team2_id.in.(${teamIds.join(',')})`)
        .order('scheduled_at', { ascending: true })
        .limit(1);
      setNextMatch(matches?.[0] as Match ?? null);

      const { data: recent } = await supabase
        .from('matches')
        .select('*, scores:match_scores(*)')
        .eq('status', 'completed')
        .or(`team1_id.in.(${teamIds.join(',')}),team2_id.in.(${teamIds.join(',')})`)
        .order('scheduled_at', { ascending: false })
        .limit(3);
      setRecentMatches((recent as Match[]) ?? []);
    } else {
      setNextMatch(null);
      setRecentMatches([]);
    }
    setLoading(false);
  }

  function getStatus() {
    switch (stats.status) {
      case 'active':
        return { label: 'EN COMPÉTITION', color: 'text-ghost-green bg-ghost-green/10 border border-ghost-green/40', live: true };
      case 'qualified':
        return { label: 'QUALIFIÉ (PHASE FINALE)', color: 'text-ghost-gold bg-ghost-gold/10 border border-ghost-gold/40', live: false };
      case 'eliminated':
        return { label: 'ÉLIMINÉ', color: 'text-ghost-red bg-ghost-red/10 border border-ghost-red/40', live: false };
      case 'registered':
      default:
        return { label: 'INSCRIT (EN ATTENTE)', color: 'text-ghost-gray bg-ghost-dark border border-ghost-border', live: false };
    }
  }

  function formatScheduled(dateStr?: string | null) {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' — ' + new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-ghost-gray text-sm font-barlow uppercase tracking-wider">
        Chargement...
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Welcome */}
      <div className="flex items-start justify-between mb-6 md:mb-8 flex-wrap gap-3">
        <div>
          <p className="text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-1">Tableau de bord</p>
          <h1 className="font-barlow font-black text-xl md:text-3xl text-white uppercase">
            BIENVENUE, <span className="text-ghost-gold">{profile?.cod_username?.toUpperCase()}</span>
          </h1>
          <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1 text-xs font-barlow font-bold uppercase tracking-wider ${getStatus().color}`}>
            {getStatus().live && <span className="w-1.5 h-1.5 rounded-full bg-ghost-green live-indicator" />}
            {getStatus().label}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Stats */}
          <div>
            <p className="section-title">MES STATISTIQUES — TOURNOI UNIFIÉ</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Pts Équipe" value={stats.teamPoints} icon={<Swords size={18} className="text-white" />} color="text-white" />
              <StatCard label="Pts Solo FFA" value={stats.soloPoints} icon={<Star size={18} className="text-ghost-gold" />} color="text-ghost-gold" />
              <StatCard label="Total Points" value={stats.totalPoints} icon={<Trophy size={18} className="text-ghost-gold" />} color="text-ghost-gold" />
              <StatCard label="Classement" value={stats.rank} icon={<TrendingUp size={18} className="text-ghost-green" />} color="text-ghost-green" />
            </div>
            {/* Breakdown mini bar */}
            <div className="mt-3 card px-3 md:px-5 py-2 md:py-3 flex items-center gap-2 md:gap-4 text-[10px] md:text-xs flex-wrap">
              <span className="font-barlow text-ghost-gray">Phase :</span>
              <span className="font-barlow font-bold text-white">6 matchs équipe (BO3)</span>
              <span className="text-ghost-border">·</span>
              <span className="font-barlow font-bold text-white">4 parties solo (FFA)</span>
              <span className="text-ghost-border">·</span>
              <span className="font-barlow font-bold text-ghost-gold">Top 16 → Phase Finale 1v1</span>
            </div>
          </div>

          {/* Next match */}
          <div>
            <p className="section-title">PROCHAIN MATCH</p>
            {nextMatch ? (
              <div
                className="card p-4 md:p-6 hover:border-ghost-gold/30 transition-all duration-200 cursor-pointer group"
                onClick={() => onNavigate('match-detail', nextMatch.id)}
              >
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <span className="font-barlow font-bold text-ghost-gold text-xs uppercase tracking-wider border border-ghost-gold/30 px-2 py-0.5">
                    {nextMatch.round_name} — {nextMatch.format}
                  </span>
                  {nextMatch.status === 'live' && (
                    <span className="flex items-center gap-1.5 text-ghost-red text-xs font-barlow font-bold uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-ghost-red live-indicator" /> EN COURS
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-6 py-4">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-ghost-gold/10 border border-ghost-gold/30 flex items-center justify-center mb-2 mx-auto">
                      <span className="font-barlow font-black text-ghost-gold text-xl">
                        {nextMatch.team1_name?.[0] ?? '?'}
                      </span>
                    </div>
                    <p className="font-barlow font-black text-white text-sm uppercase truncate max-w-[100px]">
                      {nextMatch.team1_name ?? 'TBD'}
                    </p>
                  </div>
                  <span className="font-barlow font-black text-ghost-gold text-2xl">VS</span>
                  <div className="text-center">
                    <div className="w-14 h-14 bg-ghost-gold/10 border border-ghost-gold/30 flex items-center justify-center mb-2 mx-auto">
                      <span className="font-barlow font-black text-ghost-gold text-xl">
                        {nextMatch.team2_name?.[0] ?? '?'}
                      </span>
                    </div>
                    <p className="font-barlow font-black text-white text-sm uppercase truncate max-w-[100px]">
                      {nextMatch.team2_name ?? 'TBD'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-ghost-border">
                  <div className="flex items-center gap-1.5 text-ghost-gray text-xs">
                    <Clock size={12} />
                    {formatScheduled(nextMatch.scheduled_at)}
                  </div>
                  <button className="btn-gold text-xs py-1.5 px-4 flex items-center gap-1.5">
                    VOIR DÉTAILS <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="card p-8 text-center text-ghost-gray">
                <Clock size={24} className="mx-auto mb-2 opacity-30" />
                <p className="font-barlow text-sm uppercase tracking-wider">Aucun match à venir</p>
              </div>
            )}
          </div>

          {/* Recent matches */}
          <div>
            <p className="section-title">HISTORIQUE RÉCENT</p>
            {recentMatches.length === 0 ? (
              <div className="card p-6 text-center text-ghost-gray">
                <p className="font-barlow text-sm uppercase tracking-wider">Aucun match joué</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMatches.map(match => {
                  const score1 = match.scores?.filter(s => s.team1_score > s.team2_score).length ?? 0;
                  const score2 = match.scores?.filter(s => s.team2_score > s.team1_score).length ?? 0;
                  return (
                    <div
                      key={match.id}
                      className="card px-5 py-3 hover:border-ghost-gold/20 transition-all duration-200 cursor-pointer flex items-center gap-4 flex-wrap"
                      onClick={() => onNavigate('match-detail', match.id)}
                    >
                      <span className={`text-[10px] font-barlow font-bold uppercase px-2 py-0.5 border ${
                        score1 > score2 ? 'text-ghost-green border-ghost-green/40 bg-ghost-green/10' : 'text-ghost-red border-ghost-red/40 bg-ghost-red/10'
                      }`}>
                        {score1 > score2 ? 'VICTOIRE' : 'DÉFAITE'}
                      </span>
                      <span className="font-barlow font-bold text-white text-sm flex-1 truncate">
                        {match.team1_name} vs {match.team2_name}
                      </span>
                      <span className="font-barlow font-black text-ghost-gold text-sm">
                        {score1} — {score2}
                      </span>
                      <span className="text-ghost-gray text-xs font-barlow">{match.format}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column — notifications */}
        <div className="space-y-6">
          <div>
            <p className="section-title">NOTIFICATIONS</p>
            {notifications.length === 0 ? (
              <div className="card p-6 text-center text-ghost-gray">
                <p className="font-barlow text-xs uppercase tracking-wider">Aucune notification</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div key={n.id} className={`card p-4 ${!n.read ? 'border-ghost-gold/20' : ''}`}>
                    <p className="font-barlow font-bold text-white text-xs uppercase">{n.title}</p>
                    <p className="text-ghost-gray text-xs mt-1">{n.message}</p>
                    <p className="text-ghost-gray/50 text-[10px] mt-2">
                      {new Date(n.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div>
            <p className="section-title">ACTIONS RAPIDES</p>
            <div className="space-y-2">
              {[
                { label: 'Mon équipe', page: 'mon-equipe' as Page },
                { label: 'Classement général', page: 'bracket' as Page },
                { label: 'Soumettre une preuve', page: 'mes-matchs' as Page },
                { label: 'Planning des matchs', page: 'planning' as Page },
              ].map(({ label, page }) => (
                <button
                  key={label}
                  onClick={() => onNavigate(page)}
                  className="w-full card px-4 py-3 flex items-center justify-between hover:border-ghost-gold/30 transition-all duration-200 group"
                >
                  <span className="font-barlow font-bold text-white text-xs uppercase tracking-wider group-hover:text-ghost-gold transition-colors">
                    {label}
                  </span>
                  <ChevronRight size={14} className="text-ghost-gray group-hover:text-ghost-gold transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
