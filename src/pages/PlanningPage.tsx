import { useEffect, useState } from 'react';
import { Calendar, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match, Page } from '../types';

interface PlanningPageProps {
  onNavigate: (page: Page, data?: unknown) => void;
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  scheduled: { label: 'À VENIR', class: 'text-ghost-gray bg-ghost-border/20 border border-ghost-border' },
  live: { label: 'EN COURS', class: 'text-ghost-red bg-ghost-red/10 border border-ghost-red/40' },
  completed: { label: 'TERMINÉ', class: 'text-ghost-green bg-ghost-green/10 border border-ghost-green/40' },
  forfeit: { label: 'FORFAIT', class: 'text-ghost-red bg-ghost-red/10 border border-ghost-red/40' },
  postponed: { label: 'REPORTÉ', class: 'text-ghost-gold bg-ghost-gold/10 border border-ghost-gold/40' },
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return { date: 'TBD', time: '--:--' };
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function PlanningPage({ onNavigate }: PlanningPageProps) {
  const [filter, setFilter] = useState<'all' | '4v4' | '1v1'>('all');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchMatches() {
    setLoading(true);
    let q = supabase
      .from('matches')
      .select('*')
      .order('scheduled_at', { ascending: true });
    if (filter !== 'all') q = q.eq('format', filter);
    const { data } = await q;
    setMatches((data as Match[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchMatches(); }, [filter]);

  // Group matches by date
  const grouped = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.scheduled_at
      ? new Date(m.scheduled_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Date à confirmer';
    (acc[key] = acc[key] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="px-6 py-10 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="section-title">GHOST CUP 2026</p>
          <h1 className="font-barlow font-black text-3xl text-white uppercase">PLANNING DES MATCHS</h1>
        </div>
        <button onClick={fetchMatches} className="btn-outline text-xs py-2 px-4 flex items-center gap-2">
          <RefreshCw size={12} /> ACTUALISER
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-ghost-border mb-8 gap-0">
        {[
          { key: 'all', label: 'TOUS' },
          { key: '4v4', label: '4 VS 4' },
          { key: '1v1', label: '1 VS 1' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={`px-6 py-3 font-barlow font-black text-xs uppercase tracking-widest border-b-2 transition-all duration-200 ${
              filter === key
                ? 'text-ghost-gold border-ghost-gold'
                : 'text-ghost-gray border-transparent hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-ghost-gray">
          <RefreshCw size={16} className="animate-spin" />
          <span className="font-barlow uppercase tracking-wider text-sm">Chargement...</span>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-ghost-gray">
          <Calendar size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-barlow text-sm uppercase tracking-wider">Aucun match à afficher</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, dayMatches]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <Calendar size={14} className="text-ghost-gold" />
                <span className="font-barlow font-black text-ghost-gold text-xs uppercase tracking-widest">{date}</span>
                <div className="flex-1 h-px bg-ghost-border" />
              </div>

              {/* Matches */}
              <div className="space-y-2">
                {dayMatches.map(match => {
                  const { time } = formatDate(match.scheduled_at);
                  const statusInfo = STATUS_LABELS[match.status] || STATUS_LABELS.scheduled;
                  return (
                    <div
                      key={match.id}
                      className="card hover:border-ghost-gold/30 transition-all duration-200 cursor-pointer group"
                      onClick={() => onNavigate('match-detail', match.id)}
                    >
                      <div className="flex items-center gap-4 px-5 py-4 flex-wrap">
                        {/* Time */}
                        <div className="flex items-center gap-1.5 w-16 shrink-0">
                          <Clock size={12} className="text-ghost-gray" />
                          <span className="font-barlow font-bold text-white text-xs">{time}</span>
                        </div>

                        {/* Teams */}
                        <div className="flex-1 flex items-center gap-3 min-w-[200px]">
                          <span className="font-barlow font-black text-white text-sm group-hover:text-ghost-gold transition-colors truncate">
                            {match.team1_name ?? 'À déterminer'}
                          </span>
                          <span className="font-barlow font-black text-ghost-gold text-xs shrink-0">VS</span>
                          <span className="font-barlow font-black text-white text-sm group-hover:text-ghost-gold transition-colors truncate">
                            {match.team2_name ?? 'À déterminer'}
                          </span>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-barlow font-bold text-ghost-gray text-[10px] uppercase tracking-wider border border-ghost-border px-2 py-0.5">
                            {match.format}
                          </span>
                          <span className="font-barlow font-bold text-ghost-gray text-[10px] uppercase tracking-wider">
                            {match.round_name}
                          </span>
                          <span className={`status-badge ${statusInfo.class} px-2 py-0.5`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <ChevronRight size={14} className="text-ghost-gray group-hover:text-ghost-gold transition-colors shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show all button */}
      {matches.length > 0 && (
        <div className="mt-8 text-center">
          <button className="btn-outline text-xs py-2 px-8">VOIR TOUT LE PLANNING</button>
        </div>
      )}
    </div>
  );
}
