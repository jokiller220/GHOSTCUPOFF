import { useEffect, useState } from 'react';
import { ChevronLeft, Upload, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match, Page } from '../types';

interface MatchDetailPageProps {
  matchId: string;
  onNavigate: (page: Page, data?: unknown) => void;
}

const STATUS_DISPLAY: Record<string, { label: string; class: string }> = {
  scheduled: { label: 'À VENIR', class: 'text-ghost-gray border-ghost-border' },
  live: { label: 'EN COURS', class: 'text-ghost-red border-ghost-red/40 bg-ghost-red/10' },
  completed: { label: 'TERMINÉ', class: 'text-ghost-green border-ghost-green/40 bg-ghost-green/10' },
  forfeit: { label: 'FORFAIT', class: 'text-ghost-red border-ghost-red/40' },
  postponed: { label: 'REPORTÉ', class: 'text-ghost-gold border-ghost-gold/40' },
};

export default function MatchDetailPage({ matchId, onNavigate }: MatchDetailPageProps) {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;
    (async () => {
      const { data } = await supabase
        .from('matches')
        .select('*, scores:match_scores(*)')
        .eq('id', matchId)
        .maybeSingle();
      setMatch(data as Match);
      setLoading(false);
    })();
  }, [matchId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-ghost-gray text-sm font-barlow uppercase tracking-wider">Chargement...</div>
  );

  if (!match) return (
    <div className="text-center py-12 text-ghost-gray">
      <p className="font-barlow uppercase tracking-wider">Match introuvable</p>
      <button onClick={() => onNavigate('planning')} className="btn-outline text-xs py-2 mt-4">RETOUR</button>
    </div>
  );

  const scores = match.scores ?? [];
  const totalManches = 5;
  const team1Wins = scores.filter(s => s.team1_score > s.team2_score).length;
  const team2Wins = scores.filter(s => s.team2_score > s.team1_score).length;
  const statusInfo = STATUS_DISPLAY[match.status] || STATUS_DISPLAY.scheduled;

  function formatDate(d?: string | null) {
    if (!d) return 'TBD';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' — ' + new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="animate-slide-up px-6 py-10 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => onNavigate('planning')}
        className="flex items-center gap-2 text-ghost-gray hover:text-white transition-colors mb-6 font-barlow text-xs uppercase tracking-wider"
      >
        <ChevronLeft size={14} /> RETOUR
      </button>

      {/* Title */}
      <div className="text-center mb-8">
        <span className={`status-badge border px-3 py-1 ${statusInfo.class} inline-block mb-3`}>
          {match.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-ghost-red live-indicator inline-block mr-1.5" />}
          {statusInfo.label}
        </span>
        <h1 className="font-barlow font-black text-2xl text-white uppercase">
          DÉTAIL DU MATCH
        </h1>
        <p className="font-barlow font-bold text-ghost-gold text-sm uppercase tracking-wider mt-1">
          {match.round_name} — {match.format}
        </p>
      </div>

      {/* Teams vs */}
      <div className="card mb-6 p-8">
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {/* Team 1 */}
          <div className="text-center flex-1 min-w-[120px]">
            <div className="w-20 h-20 mx-auto bg-ghost-gold/10 border-2 border-ghost-gold/30 flex items-center justify-center mb-3">
              <span className="font-barlow font-black text-ghost-gold text-3xl">
                {match.team1_name?.[0] ?? '?'}
              </span>
            </div>
            <p className="font-barlow font-black text-white text-xl uppercase">{match.team1_name ?? 'TBD'}</p>
          </div>

          {/* Score / VS */}
          <div className="text-center shrink-0">
            {match.status === 'completed' || match.status === 'live' ? (
              <>
                <p className="font-barlow font-black text-5xl text-ghost-gold leading-none">
                  {team1Wins} — {team2Wins}
                </p>
                <p className="font-barlow font-bold text-ghost-gray text-xs uppercase tracking-widest mt-2">
                  Score actuel
                </p>
              </>
            ) : (
              <>
                <p className="font-barlow font-black text-3xl text-ghost-gold">VS</p>
                <div className="flex items-center gap-1.5 justify-center mt-2">
                  <Clock size={10} className="text-ghost-gray" />
                  <span className="text-ghost-gray text-xs font-barlow">{formatDate(match.scheduled_at)}</span>
                </div>
              </>
            )}
            <div className="mt-2 border border-ghost-border px-3 py-0.5 inline-block">
              <span className="font-barlow font-bold text-ghost-gray text-xs uppercase">BO5</span>
            </div>
          </div>

          {/* Team 2 */}
          <div className="text-center flex-1 min-w-[120px]">
            <div className="w-20 h-20 mx-auto bg-ghost-gold/10 border-2 border-ghost-gold/30 flex items-center justify-center mb-3">
              <span className="font-barlow font-black text-ghost-gold text-3xl">
                {match.team2_name?.[0] ?? '?'}
              </span>
            </div>
            <p className="font-barlow font-black text-white text-xl uppercase">{match.team2_name ?? 'TBD'}</p>
          </div>
        </div>

        {match.scheduled_at && (
          <p className="text-center text-ghost-gray text-xs font-barlow mt-4">
            {formatDate(match.scheduled_at)}
          </p>
        )}
      </div>

      {/* Info + Score grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Match info */}
        <div className="card p-6">
          <p className="section-title mb-4">INFORMATIONS</p>
          <table className="w-full text-sm">
            <tbody>
              {[
                { label: 'Mode de jeu', value: match.mode ?? '—' },
                { label: 'Carte', value: match.map ?? '—' },
                { label: 'Arbitre', value: 'Admin Ghost Cup' },
                { label: 'Salon / Lobby', value: 'À venir' },
              ].map(({ label, value }) => (
                <tr key={label} className="border-b border-ghost-border last:border-0">
                  <td className="py-2.5 text-ghost-gray text-xs font-barlow uppercase tracking-wider pr-4 w-1/2">{label}</td>
                  <td className="py-2.5 text-white text-xs font-barlow font-bold">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Score breakdown */}
        <div className="card p-6">
          <p className="section-title mb-4">SCORE</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-ghost-border">
                <th className="text-ghost-gray text-[10px] font-barlow uppercase tracking-wider text-left pb-2"></th>
                <th className="text-white text-xs font-barlow font-black uppercase pb-2 text-center truncate max-w-[80px]">
                  {match.team1_name?.substring(0, 10) ?? 'T1'}
                </th>
                <th className="text-white text-xs font-barlow font-black uppercase pb-2 text-center truncate max-w-[80px]">
                  {match.team2_name?.substring(0, 10) ?? 'T2'}
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: totalManches }).map((_, i) => {
                const s = scores.find(s => s.manche_number === i + 1);
                const s1Won = s && s.team1_score > s.team2_score;
                const s2Won = s && s.team2_score > s.team1_score;
                return (
                  <tr key={i} className="border-b border-ghost-border/30 last:border-0">
                    <td className="py-2 text-ghost-gray text-xs font-barlow">Manche {i + 1}</td>
                    <td className={`py-2 text-sm font-barlow font-black text-center ${s1Won ? 'text-ghost-gold' : 'text-ghost-gray'}`}>
                      {s ? s.team1_score : '—'}
                    </td>
                    <td className={`py-2 text-sm font-barlow font-black text-center ${s2Won ? 'text-ghost-gold' : 'text-ghost-gray'}`}>
                      {s ? s.team2_score : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-ghost-border bg-ghost-black/20">
                <td className="py-2 text-ghost-gold text-xs font-barlow font-black uppercase">SCORE FINAL</td>
                <td className={`py-2 text-xl font-barlow font-black text-center ${team1Wins > team2Wins ? 'text-ghost-gold' : 'text-white'}`}>
                  {team1Wins}
                </td>
                <td className={`py-2 text-xl font-barlow font-black text-center ${team2Wins > team1Wins ? 'text-ghost-gold' : 'text-white'}`}>
                  {team2Wins}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {(match.status === 'completed' || match.status === 'live') && (
          <button
            onClick={() => onNavigate('preuve-score', match.id)}
            className="btn-gold text-xs py-2.5 flex items-center gap-2"
          >
            <Upload size={14} /> SOUMETTRE UNE PREUVE
          </button>
        )}
        <button className="btn-outline text-xs py-2.5 flex items-center gap-2 text-ghost-red border-ghost-red/30 hover:border-ghost-red">
          <AlertTriangle size={14} /> SIGNALER UN PROBLÈME
        </button>
      </div>
    </div>
  );
}
