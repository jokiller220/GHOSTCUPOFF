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

  useEffect(() => {
    (async () => {
      const [{ data: matchData }, { data: entryData }] = await Promise.all([
        supabase
          .from('matches')
          .select('*, scores:match_scores(*)')
          .eq('format', '4v4')
          .order('scheduled_at', { ascending: false }),
        profile ? supabase
          .from('tournament_entries')
          .select('team_points, solo_points')
          .eq('profile_id', profile.id)
          .maybeSingle() : Promise.resolve({ data: null })
      ]);
      setMatches((matchData as Match[]) ?? []);
      if (entryData) {
        setTeamPts(entryData.team_points || 0);
        setSoloPts(entryData.solo_points || 0);
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

      {/* Tabs */}
      <div className="flex border-b border-ghost-border mb-6">
        <button
          onClick={() => setTab('equipe')}
          className={`px-3 md:px-6 py-3 font-barlow font-black text-[10px] md:text-xs uppercase tracking-widest border-b-2 flex items-center gap-1.5 md:gap-2 transition-all duration-200 whitespace-nowrap ${
            tab === 'equipe' ? 'text-ghost-gold border-ghost-gold' : 'text-ghost-gray border-transparent hover:text-white'
          }`}
        >
          <Users size={14} /> MATCHS ÉQUIPE (BO3)
        </button>
        <button
          onClick={() => setTab('solo')}
          className={`px-3 md:px-6 py-3 font-barlow font-black text-[10px] md:text-xs uppercase tracking-widest border-b-2 flex items-center gap-1.5 md:gap-2 transition-all duration-200 whitespace-nowrap ${
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
            <p className="text-ghost-gray/50 text-xs mt-2">4 matchs en poule (BO3) à venir</p>
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
                    {match.status === 'completed' && (
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
            <p className="text-ghost-gray text-xs mt-2">Les détails des parties FFA sont saisis par les administrateurs après chaque round. Vos points globaux s'actualiseront ici.</p>
          </div>
        </div>
      )}
    </div>
  );
}
