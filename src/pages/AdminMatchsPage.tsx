import { useEffect, useState } from 'react';
import { RefreshCw, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match, Page } from '../types';

interface AdminMatchsPageProps {
  onNavigate: (page: Page, data?: unknown) => void;
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  scheduled: { label: 'À VENIR', class: 'text-ghost-gray border-ghost-border' },
  live: { label: 'EN COURS', class: 'text-ghost-red border-ghost-red/40 bg-ghost-red/10' },
  completed: { label: 'TERMINÉ', class: 'text-ghost-green border-ghost-green/40 bg-ghost-green/10' },
  forfeit: { label: 'FORFAIT', class: 'text-ghost-red border-ghost-red/40' },
  postponed: { label: 'REPORTÉ', class: 'text-ghost-gold border-ghost-gold/40' },
};

export default function AdminMatchsPage({ onNavigate }: AdminMatchsPageProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFormat, setFilterFormat] = useState<'all' | '4v4' | '1v1'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    load();
  }, [filterFormat, filterStatus]);

  async function load() {
    setLoading(true);
    let q = supabase
      .from('matches')
      .select('*, scores:match_scores(*)')
      .order('round_order', { ascending: true })
      .order('scheduled_at', { ascending: true });

    if (filterFormat !== 'all') q = q.eq('format', filterFormat);
    if (filterStatus !== 'all') q = q.eq('status', filterStatus);

    const { data } = await q;
    setMatches((data as Match[]) ?? []);
    setLoading(false);
  }

  async function updateMatchStatusById(matchId: string, status: string) {
    await supabase.from('matches').update({ status }).eq('id', matchId);
    load();
  }

  async function advanceMatch(matchId: string) {
    const { data } = await supabase.from('matches').select('next_match_id').eq('id', matchId).maybeSingle();
    if (!data?.next_match_id) return;
    await supabase.from('matches').update({ status: 'scheduled' }).eq('id', data.next_match_id);
    load();
  }

  function formatDate(d?: string | null) {
    if (!d) return 'TBD';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
      ' ' + new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="section-title">ADMIN</p>
          <h1 className="font-barlow font-black text-3xl text-white uppercase">GESTION DES MATCHS</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onNavigate('admin-ffa')} className="btn-outline text-xs py-2 px-4 flex items-center gap-2 border-ghost-gold text-ghost-gold hover:bg-ghost-gold hover:text-black">
            <Target size={12} /> RÉSULTATS FFA
          </button>
          <button onClick={load} className="btn-outline text-xs py-2 px-4 flex items-center gap-2">
            <RefreshCw size={12} /> ACTUALISER
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex border border-ghost-border">
          {[
            { key: 'all', label: 'TOUS' },
            { key: '4v4', label: '4 VS 4' },
            { key: '1v1', label: '1 VS 1' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterFormat(key as typeof filterFormat)}
              className={`px-4 py-2 font-barlow font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                filterFormat === key ? 'bg-ghost-gold text-black' : 'text-ghost-gray hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex border border-ghost-border">
          {[
            { key: 'all', label: 'TOUS STATUS' },
            { key: 'live', label: 'EN COURS' },
            { key: 'scheduled', label: 'À VENIR' },
            { key: 'completed', label: 'TERMINÉS' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-4 py-2 font-barlow font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                filterStatus === key ? 'bg-ghost-gold text-black' : 'text-ghost-gray hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Match list */}
      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-ghost-gray">
          <RefreshCw size={16} className="animate-spin" />
          <span className="font-barlow uppercase tracking-wider text-sm">Chargement...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map(match => {
            const statusInfo = STATUS_LABELS[match.status] || STATUS_LABELS.scheduled;
            const score1 = match.scores?.filter(s => s.team1_score > s.team2_score).length ?? 0;
            const score2 = match.scores?.filter(s => s.team2_score > s.team1_score).length ?? 0;
            return (
              <div
                key={match.id}
                className="card hover:border-ghost-gold/40 transition-all duration-200 cursor-pointer group"
                onClick={() => onNavigate('admin-match-detail', match.id)}
              >
                <div className="flex items-center gap-4 px-5 py-4 flex-wrap">
                  {/* Format */}
                  <span className="font-barlow font-bold text-ghost-gold text-[10px] border border-ghost-gold/30 px-2 py-0.5 shrink-0">
                    {match.format}
                  </span>

                  {/* Round */}
                  <span className="font-barlow text-ghost-gray text-[10px] uppercase tracking-wider shrink-0 w-24">
                    {match.round_name}
                  </span>

                  {/* Teams */}
                  <div className="flex-1 flex items-center gap-3 min-w-[200px]">
                    <span className="font-barlow font-black text-white text-sm group-hover:text-ghost-gold transition-colors truncate">
                      {match.team1_name ?? 'TBD'}
                    </span>
                    {match.status === 'completed' ? (
                      <span className="font-barlow font-black text-ghost-gold text-sm shrink-0">{score1} — {score2}</span>
                    ) : (
                      <span className="font-barlow font-bold text-ghost-gray text-xs shrink-0">vs</span>
                    )}
                    <span className="font-barlow font-black text-white text-sm group-hover:text-ghost-gold transition-colors truncate">
                      {match.team2_name ?? 'TBD'}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-ghost-gray text-xs shrink-0">
                    <Clock size={10} />
                    {formatDate(match.scheduled_at)}
                  </div>

                  {/* Status */}
                  <span className={`status-badge border px-2 py-0.5 ${statusInfo.class}`}>
                    {match.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-ghost-red live-indicator inline-block mr-1" />}
                    {statusInfo.label}
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); updateMatchStatusById(match.id, 'postponed'); }}
                      className="btn-outline text-[10px] py-1 px-2"
                    >
                      REPORTER
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); updateMatchStatusById(match.id, 'forfeit'); }}
                      className="btn-red text-[10px] py-1 px-2"
                    >
                      FORFAIT
                    </button>
                    {match.next_match_id && match.status === 'completed' && (
                      <button
                        onClick={e => { e.stopPropagation(); advanceMatch(match.id); }}
                        className="btn-dark text-[10px] py-1 px-2"
                      >
                        AVANCER
                      </button>
                    )}
                  </div>

                  <ChevronRight size={14} className="text-ghost-gray group-hover:text-ghost-gold transition-colors shrink-0" />
                </div>
              </div>
            );
          })}

          {matches.length === 0 && (
            <div className="card p-12 text-center">
              <p className="font-barlow text-ghost-gray text-sm uppercase tracking-wider">Aucun match à afficher</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
