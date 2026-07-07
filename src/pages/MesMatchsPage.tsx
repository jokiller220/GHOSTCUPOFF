import { useEffect, useState } from 'react';
import { Clock, ChevronRight, Upload, Users, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match, Page } from '../types';
import { useAuth } from '../context/AuthContext';

interface MesMatchsPageProps {
  onNavigate: (page: Page, data?: unknown) => void;
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  scheduled: { label: 'À VENIR', class: 'text-ghost-gray border-ghost-border' },
  live: { label: 'EN COURS', class: 'text-ghost-red border-ghost-red/40 bg-ghost-red/10' },
  completed: { label: 'TERMINÉ', class: 'text-ghost-green border-ghost-green/40 bg-ghost-green/10' },
  forfeit: { label: 'FORFAIT', class: 'text-ghost-red border-ghost-red/40' },
  postponed: { label: 'REPORTÉ', class: 'text-ghost-gold border-ghost-gold/40' },
};

export default function MesMatchsPage({ onNavigate }: MesMatchsPageProps) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'equipe' | 'solo'>('equipe');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamPts, setTeamPts] = useState(0);
  const [soloPts, setSoloPts] = useState(0);
  const [myFfaLobbies, setMyFfaLobbies] = useState<{ round: number; date: string; time: string; name: string; players: any[] }[]>([]);

  useEffect(() => {
    (async () => {
      // Get user's teams
      let teamIds: string[] = [];
      if (profile) {
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('profile_id', profile.id);
        teamIds = teamMembers?.map(tm => tm.team_id) || [];
      }

      let matchPromise = Promise.resolve({ data: [] });
      if (teamIds.length > 0) {
        matchPromise = supabase
          .from('matches')
          .select('*, scores:match_scores(*)')
          .eq('format', '4v4')
          .or(`team1_id.in.(${teamIds.join(',')}),team2_id.in.(${teamIds.join(',')})`)
          .order('scheduled_at', { ascending: false });
      }

      const [{ data: matchData }, { data: entryData }, { data: configData }] = await Promise.all([
        matchPromise,
        profile ? supabase
          .from('tournament_entries')
          .select('team_points, solo_points')
          .eq('profile_id', profile.id)
          .maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('schedule_config').select('config').eq('type', 'ffa').maybeSingle()
      ]);
      setMatches((matchData as Match[]) ?? []);
      if (entryData) {
        setTeamPts(entryData.team_points || 0);
        setSoloPts(entryData.solo_points || 0);
      }
      
      if (configData?.config?.lobbies && profile) {
        const config = configData.config;
        const myLobbies = [];
        for (const roundData of config.lobbies) {
          const myLobby = roundData.lobbies.find((l: any) => l.players.some((p: any) => p.id === profile.id));
          if (myLobby) {
            const dateInfo = config.dates?.[roundData.round - 1] || null;
            myLobbies.push({
              round: roundData.round,
              name: myLobby.name,
              players: myLobby.players,
              date: dateInfo?.date,
              time: dateInfo?.time || dateInfo?.times?.[0]
            });
          }
        }
        setMyFfaLobbies(myLobbies);
      }
      setLoading(false);
    })();
  }, [profile]);

  function formatDate(d?: string | null) {
    if (!d) return 'TBD';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' — ' + new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="animate-slide-up">
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="section-title">GHOST CUP</p>
          <h1 className="font-barlow font-black text-xl md:text-3xl text-white uppercase">MES MATCHS</h1>
        </div>
        {/* Mini points counter */}
        <div className="card px-3 md:px-5 py-2 md:py-3 flex items-center gap-3 md:gap-5">
          <div className="text-center">
            <p className="font-barlow font-black text-white text-lg leading-none">{teamPts}</p>
            <p className="text-ghost-gray text-[10px] uppercase tracking-widest">Pts Équipe</p>
          </div>
          <span className="text-ghost-border">+</span>
          <div className="text-center">
            <p className="font-barlow font-black text-white text-lg leading-none">{soloPts}</p>
            <p className="text-ghost-gray text-[10px] uppercase tracking-widest">Pts Solo</p>
          </div>
          <span className="text-ghost-border">=</span>
          <div className="text-center">
            <p className="font-barlow font-black text-ghost-gold text-xl leading-none">{teamPts + soloPts}</p>
            <p className="text-ghost-gray text-[10px] uppercase tracking-widest">Total</p>
          </div>
        </div>
      </div>

      {/* Mobile Select Menu */}
      <div className="md:hidden mb-6">
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as any)}
          className="w-full bg-ghost-card border border-ghost-border text-white px-4 py-3 font-barlow font-black text-sm uppercase tracking-widest focus:border-ghost-gold outline-none transition-colors"
        >
          <option value="equipe">Matchs Équipe (BO3)</option>
          <option value="solo">Parties Solo (FFA)</option>
        </select>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:flex border-b border-ghost-border mb-6">
        <button
          onClick={() => setTab('equipe')}
          className={`px-6 py-3 font-barlow font-black text-xs uppercase tracking-widest border-b-2 flex items-center gap-2 transition-all duration-200 ${
            tab === 'equipe' ? 'text-ghost-gold border-ghost-gold' : 'text-ghost-gray border-transparent hover:text-white'
          }`}
        >
          <Users size={14} /> MATCHS ÉQUIPE (BO3)
        </button>
        <button
          onClick={() => setTab('solo')}
          className={`px-6 py-3 font-barlow font-black text-xs uppercase tracking-widest border-b-2 flex items-center gap-2 transition-all duration-200 ${
            tab === 'solo' ? 'text-ghost-gold border-ghost-gold' : 'text-ghost-gray border-transparent hover:text-white'
          }`}
        >
          <Target size={14} /> PARTIES SOLO (FFA)
        </button>
      </div>

      {/* Equipe tab */}
      {tab === 'equipe' && (
        loading ? (
          <div className="flex items-center justify-center h-48 text-ghost-gray text-sm font-barlow uppercase tracking-wider">Chargement...</div>
        ) : matches.length === 0 ? (
          <div className="card p-12 text-center">
            <Clock size={32} className="mx-auto mb-3 text-ghost-gray/30" />
            <p className="font-barlow text-ghost-gray text-sm uppercase tracking-wider">Aucun match d'équipe</p>
            <p className="text-ghost-gray/50 text-xs mt-2">6 matchs de poule (BO3) à venir</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map(match => {
              const statusInfo = STATUS_LABELS[match.status] || STATUS_LABELS.scheduled;
              const score1 = match.scores?.filter(s => s.team1_score > s.team2_score).length ?? 0;
              const score2 = match.scores?.filter(s => s.team2_score > s.team1_score).length ?? 0;
              return (
                <div
                  key={match.id}
                  className="card hover:border-ghost-gold/30 transition-all duration-200 cursor-pointer group"
                  onClick={() => onNavigate('match-detail', match.id)}
                >
                  <div className="flex items-center gap-5 px-5 py-4 flex-wrap">
                    <span className="font-barlow font-bold text-ghost-gold text-xs border border-ghost-gold/30 px-2 py-0.5 shrink-0">4v4</span>
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="font-barlow font-black text-white text-sm group-hover:text-ghost-gold transition-colors">{match.team1_name ?? 'TBD'}</span>
                        {match.status === 'completed' && <span className="font-barlow font-black text-ghost-gold text-sm">{score1} — {score2}</span>}
                        <span className="font-barlow font-bold text-ghost-gray text-xs">vs</span>
                        <span className="font-barlow font-black text-white text-sm group-hover:text-ghost-gold transition-colors">{match.team2_name ?? 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-ghost-gray text-[10px] font-barlow">{match.round_name}</span>
                        <span className="text-ghost-border">·</span>
                        <span className="text-ghost-gray text-[10px] font-barlow flex items-center gap-1">
                          <Clock size={10} /> {formatDate(match.scheduled_at)}
                        </span>
                      </div>
                    </div>
                    <span className={`status-badge border px-2 py-0.5 ${statusInfo.class}`}>{statusInfo.label}</span>
                    {['scheduled', 'live', 'completed'].includes(match.status) && (
                      <button
                        onClick={e => { e.stopPropagation(); onNavigate('preuve-score', match.id); }}
                        className="btn-outline text-[10px] py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <Upload size={10} /> PREUVE
                      </button>
                    )}
                    <ChevronRight size={14} className="text-ghost-gray group-hover:text-ghost-gold transition-colors shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Solo FFA tab */}
      {tab === 'solo' && (
        <div className="space-y-3">
          <div className="card px-5 py-3 bg-ghost-gold/5 border-ghost-gold/20 flex items-center gap-3">
            <Target size={16} className="text-ghost-gold shrink-0" />
            <p className="text-ghost-gray text-xs leading-relaxed">
              4 parties FFA (mêlée générale) — Lobby de ~6 joueurs choisis aléatoirement.
              <span className="text-ghost-gold font-barlow font-bold ml-2">1er=5pts · 2e=3pts · 3e=2pts · 4e=1pt · autres=0pt</span>
            </p>
          </div>
          <div className="card p-8 text-center mt-6">
            <Target size={32} className="mx-auto mb-3 text-ghost-gold/50" />
            <p className="font-barlow text-white text-sm uppercase tracking-wider font-bold">Total des points solo : {soloPts}</p>
          </div>

          {myFfaLobbies.length === 0 ? (
            <div className="card p-12 text-center mt-6">
              <Clock size={32} className="mx-auto mb-3 text-ghost-gray/30" />
              <p className="font-barlow text-ghost-gray text-sm uppercase tracking-wider">Les lobbys ne sont pas encore générés.</p>
              <p className="text-ghost-gray/50 text-xs mt-2">Revenez plus tard pour découvrir vos prochains matchs FFA.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-6">
              <h3 className="font-barlow font-black text-white text-lg uppercase tracking-wider mb-2">Mes Lobbys (À venir)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {myFfaLobbies.map(lobby => (
                  <div key={lobby.round} className="card p-5 hover:border-ghost-gold/30 transition-colors">
                    <div className="flex items-center justify-between border-b border-ghost-border/30 pb-3 mb-3">
                      <div>
                        <span className="font-barlow font-black text-ghost-gold text-sm uppercase tracking-widest">{lobby.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-ghost-gray text-[10px] font-barlow uppercase">Partie {lobby.round}</span>
                          <span className="text-ghost-border">·</span>
                          <span className="text-ghost-gray text-[10px] font-barlow flex items-center gap-1">
                            <Clock size={10} /> 
                            {lobby.date ? formatDate(`${lobby.date}T${lobby.time || '18:00:00'}`) : 'TBD'}
                          </span>
                        </div>
                      </div>
                      <span className="status-badge text-ghost-gray border border-ghost-border px-2 py-0.5">À VENIR</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-ghost-gray-light text-xs font-barlow">
                      {lobby.players.map(player => (
                        <div 
                          key={player.id} 
                          className={`rounded-lg px-3 py-2 truncate border ${player.id === profile?.id ? 'bg-ghost-gold/10 border-ghost-gold/40 text-white font-bold' : 'bg-ghost-dark/80 border-ghost-border/20'}`}
                        >
                          {player.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
