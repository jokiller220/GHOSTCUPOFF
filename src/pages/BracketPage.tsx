import { useEffect, useState } from 'react';
import { RefreshCw, Trophy, Users, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getChampionFromMatches } from '../lib/tournament';
import { Match, Page } from '../types';
import BracketTree from '../components/BracketTree';

interface BracketPageProps {
  onNavigate: (page: Page, data?: unknown) => void;
}

interface LeaderboardEntry {
  rank: number;
  cod_username: string;
  team_name: string;
  team_pts: number;
  solo_pts: number;
  total_pts: number;
  diff: string;
  status: 'Qualifié' | 'En lice';
}

export default function BracketPage({ onNavigate }: BracketPageProps) {
  const [activeTab, setActiveTab] = useState<'classement' | 'bracket' | 'solo'>('classement');
  const [matches, setMatches] = useState<Match[]>([]);
  const [soloLobbyRounds, setSoloLobbyRounds] = useState<any[]>([]);
  const [ffaDates, setFfaDates] = useState<{ date: string; time: string }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [champion, setChampion] = useState<string | null>(null);

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('tournament_entries')
      .select('*, profile:profiles(cod_username), team:teams(name)')
      .order('total_points', { ascending: false })
      .order('team_points', { ascending: false })
      .order('solo_points', { ascending: false })
      .limit(24);

    const entries = (data as any[] ?? []).map((entry, index) => ({
      rank: index + 1,
      cod_username: entry.profile?.cod_username ?? 'INCONNU',
      team_name: entry.team?.name ?? 'Solo',
      team_pts: entry.team_points ?? 0,
      solo_pts: entry.solo_points ?? 0,
      total_pts: entry.total_points ?? 0,
      diff: entry.total_points != null ? `${entry.total_points - (entry.team_points ?? 0) - (entry.solo_points ?? 0)}` : '0',
      status: entry.qualified ? ('Qualifié' as const) : ('En lice' as const),
    }));
    setLeaderboard(entries);
  }

  async function fetchMatches() {
    setLoading(true);
    const { data } = await supabase
      .from('matches')
      .select('*, scores:match_scores(*)')
      .eq('format', '1v1')
      .order('round_order')
      .order('match_order');
    setMatches((data as Match[]) ?? []);
    setLoading(false);
  }

  async function fetchSoloLobbies() {
    setLoading(true);
    const { data } = await supabase.from('schedule_config').select('config').eq('type', 'ffa').single();
    setSoloLobbyRounds(data?.config?.lobbies || []);
    setFfaDates(data?.config?.dates || []);
    setLoading(false);
  }

  useEffect(() => {
    if (activeTab === 'bracket') {
      fetchMatches();
    } else if (activeTab === 'solo') {
      fetchSoloLobbies();
    } else {
      fetchLeaderboard();
    }
  }, [activeTab]);

  async function fetchChampion() {
    const { data } = await supabase
      .from('matches')
      .select('*, scores:match_scores(*)')
      .eq('format', '1v1')
      .eq('status', 'completed');

    const winner = getChampionFromMatches(data as Match[] ?? []);
    setChampion(winner);
  }

  useEffect(() => {
    fetchChampion();
  }, []);

  useEffect(() => {
    if (activeTab !== 'bracket') return undefined;

    const sub = supabase
      .channel('bracket-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, async () => {
        await fetchMatches();
        await fetchChampion();
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [activeTab]);

  const liveMatches = matches.filter(m => m.status === 'live');

  return (
    <div className="px-4 md:px-6 py-6 md:py-10 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-3">
        <div>
          <p className="section-title">GHOST CUP 2026</p>
          <h1 className="font-barlow font-black text-2xl md:text-3xl text-white uppercase">SUIVI DU TOURNOI</h1>
          <p className="text-ghost-gray text-xs uppercase tracking-wider mt-1">Qualifications & Phase Finale</p>
        </div>
        {activeTab === 'bracket' && (
          <button
            onClick={fetchMatches}
            className="btn-outline text-xs py-2 px-4 flex items-center gap-2 self-start"
          >
            <RefreshCw size={12} />
            ACTUALISER
          </button>
        )}
      </div>
      {champion && (
        <div className="rounded-3xl border border-ghost-gold/20 bg-ghost-gold/10 p-4 mt-4">
          <p className="text-ghost-gold text-[10px] uppercase tracking-[0.35em] font-barlow mb-2">Champion actuel</p>
          <p className="font-barlow font-black text-white text-2xl uppercase">{champion}</p>
        </div>
      )}

      {/* Mobile Select Menu */}
      <div className="md:hidden mb-6">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as any)}
          className="w-full bg-ghost-card border border-ghost-border text-white px-4 py-3 font-barlow font-black text-sm uppercase tracking-widest focus:border-ghost-gold outline-none transition-colors"
        >
          <option value="classement">Classement (Phase 1)</option>
          <option value="solo">Mêlée Générale (FFA)</option>
          <option value="bracket">Finale 1v1 (Phase 2)</option>
        </select>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:flex border-b border-ghost-border mb-8">
        <button
          onClick={() => setActiveTab('classement')}
          className={`px-8 py-3 font-barlow font-black text-sm uppercase tracking-widest border-b-2 transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'classement'
              ? 'text-ghost-gold border-ghost-gold'
              : 'text-ghost-gray border-transparent hover:text-white'
          }`}
        >
          <Users size={14} />
          Classement (Phase 1)
        </button>
        <button
          onClick={() => setActiveTab('solo')}
          className={`px-8 py-3 font-barlow font-black text-sm uppercase tracking-widest border-b-2 transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'solo'
              ? 'text-ghost-gold border-ghost-gold'
              : 'text-ghost-gray border-transparent hover:text-white'
          }`}
        >
          <Target size={14} />
          Mêlée Générale (FFA)
        </button>
        <button
          onClick={() => setActiveTab('bracket')}
          className={`px-8 py-3 font-barlow font-black text-sm uppercase tracking-widest border-b-2 transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'bracket'
              ? 'text-ghost-gold border-ghost-gold'
              : 'text-ghost-gray border-transparent hover:text-white'
          }`}
        >
          <Trophy size={14} />
          Finale 1v1 (Phase 2)
        </button>
      </div>

      {/* Content */}
      {activeTab === 'classement' ? (
        <div>
          <div className="flex items-start gap-3 mb-6 bg-ghost-gold/5 border border-ghost-gold/20 p-3 md:p-4">
            <Trophy size={18} className="text-ghost-gold shrink-0 mt-0.5" />
            <p className="text-ghost-gray text-xs leading-relaxed">
              Qualifications en cours. Chaque joueur cumule ses points issus des matchs en <strong className="text-white">Équipe (BO3)</strong> et des parties <strong className="text-white">Solo (FFA)</strong>. Le <strong className="text-ghost-gold">Top 16</strong> se qualifie pour le bracket final en 1v1.
            </p>
          </div>

          {/* Desktop table */}
          <div className="card border-ghost-border overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-ghost-border text-ghost-gray font-barlow uppercase text-[10px] tracking-widest">
                  <th className="py-3 px-4">Rang</th>
                  <th className="py-3 px-4">Pseudo COD</th>
                  <th className="py-3 px-4">Équipe</th>
                  <th className="py-3 px-4 text-center">Pts Équipe</th>
                  <th className="py-3 px-4 text-center">Pts Solo</th>
                  <th className="py-3 px-4 text-center">Total</th>
                  <th className="py-3 px-4 text-center">Diff.</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((player) => (
                  <tr key={player.cod_username} className="border-b border-ghost-border/40 hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-barlow font-bold text-ghost-gold">{player.rank}</td>
                    <td className="py-3.5 px-4 font-barlow font-bold text-white">{player.cod_username}</td>
                    <td className="py-3.5 px-4 text-ghost-gray-light text-xs font-barlow">{player.team_name}</td>
                    <td className="py-3.5 px-4 text-center text-ghost-gray-light text-xs font-barlow">{player.team_pts}</td>
                    <td className="py-3.5 px-4 text-center text-ghost-gray-light text-xs font-barlow">{player.solo_pts}</td>
                    <td className="py-3.5 px-4 text-center text-white font-barlow font-bold">{player.total_pts} pts</td>
                    <td className="py-3.5 px-4 text-center text-ghost-gray-light text-xs font-barlow">{player.diff}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-ghost-gold/10 text-ghost-gold border border-ghost-gold/30 px-2 py-0.5 text-[10px] uppercase font-barlow font-bold">
                        {player.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-2">
            {leaderboard.length === 0 ? (
              <div className="card p-8 text-center text-ghost-gray">
                <p className="font-barlow text-sm uppercase tracking-wider">Aucun classement disponible</p>
              </div>
            ) : (
              leaderboard.map((player) => (
                <div key={player.cod_username} className="card px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-barlow font-black text-ghost-gold text-lg w-7">#{player.rank}</span>
                      <div>
                        <p className="font-barlow font-bold text-white text-sm">{player.cod_username}</p>
                        <p className="text-ghost-gray text-[10px] font-barlow uppercase">{player.team_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-barlow font-black text-ghost-gold text-lg leading-none">{player.total_pts}</p>
                      <p className="text-ghost-gray text-[10px] uppercase">pts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-ghost-gray font-barlow border-t border-ghost-border/30 pt-2 mt-1">
                    <span>Équipe: <strong className="text-white">{player.team_pts}</strong></span>
                    <span className="text-ghost-border">·</span>
                    <span>Solo: <strong className="text-white">{player.solo_pts}</strong></span>
                    <span className="text-ghost-border">·</span>
                    <span>Diff: <strong className="text-white">{player.diff}</strong></span>
                    <span className="ml-auto bg-ghost-gold/10 text-ghost-gold border border-ghost-gold/30 px-1.5 py-0.5 uppercase font-bold">{player.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'solo' ? (
        <div className="space-y-6">
          <div className="flex items-start gap-3 mb-6 bg-ghost-gold/5 border border-ghost-gold/20 p-3 md:p-4">
            <Target size={18} className="text-ghost-gold shrink-0 mt-0.5" />
            <p className="text-ghost-gray text-xs leading-relaxed">
              Voici la composition des lobbys pour la phase <strong className="text-white">Mêlée Générale (FFA)</strong>. Cherchez votre pseudo pour connaître votre groupe de jeu !
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 gap-3 text-ghost-gray">
              <RefreshCw size={16} className="animate-spin" />
              <span className="font-barlow uppercase tracking-wider text-sm">Chargement...</span>
            </div>
          ) : soloLobbyRounds.length === 0 ? (
            <div className="card p-8 text-center text-ghost-gray">
              <p className="font-barlow text-sm uppercase tracking-wider">Les lobbys n'ont pas encore été publiés.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {soloLobbyRounds.map((round: any) => {
                const schedule = ffaDates[round.round - 1];
                const scheduleText = schedule && schedule.date ? 
                  `${new Date(schedule.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${schedule.time || '--:--'}` : 
                  'Date à confirmer';

                return (
                  <div key={round.round} className="card p-4 md:p-5 border-ghost-border/50">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-barlow font-black text-ghost-gold uppercase text-sm md:text-base tracking-[0.2em]">
                        Partie {round.round}
                      </p>
                      <span className="font-barlow text-[10px] uppercase tracking-wider text-ghost-gray border border-ghost-border/30 px-2 py-1 rounded">
                        {scheduleText}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {round.lobbies.map((lobby: any) => (
                        <div key={lobby.name} className="rounded-2xl border border-ghost-border/30 bg-black/30 p-4 hover:border-ghost-border/50 transition-colors">
                          <p className="font-barlow font-bold text-white text-[11px] uppercase tracking-wider mb-3">
                            {lobby.name}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-ghost-gray-light text-xs font-barlow">
                            {lobby.players.map((player: any) => (
                              <div key={player.id} className="rounded-lg bg-ghost-dark/80 px-3 py-2 truncate border border-ghost-border/20">
                                {player.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {liveMatches.length > 0 && (
            <div className="mb-6 flex items-center gap-3 bg-ghost-red/10 border border-ghost-red/30 px-4 py-3">
              <span className="w-2 h-2 rounded-full bg-ghost-red live-indicator" />
              <span className="font-barlow font-bold text-ghost-red text-xs uppercase tracking-wider">
                {liveMatches.length} match{liveMatches.length > 1 ? 's' : ''} en cours
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48 gap-3 text-ghost-gray">
              <RefreshCw size={16} className="animate-spin" />
              <span className="font-barlow uppercase tracking-wider text-sm">Chargement...</span>
            </div>
          ) : (
            <div className="card p-3 md:p-6 border-ghost-border w-full max-w-full overflow-hidden">
              <div className="text-right mb-2 flex items-center justify-end gap-2 text-ghost-gold/70 text-[10px] uppercase tracking-widest font-barlow">
                <span>Faites défiler horizontalement</span>
                <span className="animate-pulse">👉</span>
              </div>
              <div className="overflow-x-auto custom-scrollbar pb-4 w-full">
                <BracketTree
                  matches={matches}
                  onMatchClick={(m) => onNavigate('match-detail', m.id)}
                />
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 md:gap-6">
            {[
              { color: 'bg-ghost-green', label: 'Terminé' },
              { color: 'bg-ghost-red', label: 'En cours' },
              { color: 'bg-ghost-border', label: 'À venir' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-ghost-gray text-xs font-barlow uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
