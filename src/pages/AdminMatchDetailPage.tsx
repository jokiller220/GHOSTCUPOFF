import { useEffect, useState } from 'react';
import { ChevronLeft, Check, Edit2, Flag, Calendar, Clock, XCircle, AlertCircle, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match, MatchScore, Page } from '../types';
import { useAuth } from '../context/AuthContext';

interface AdminMatchDetailPageProps {
  matchId: string;
  onNavigate: (page: Page, data?: unknown) => void;
}

type ActiveTab = 'score' | 'params' | 'history';

export default function AdminMatchDetailPage({ matchId, onNavigate }: AdminMatchDetailPageProps) {
  const { profile } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState<MatchScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('score');
  
  // Params state
  const [scheduledAt, setScheduledAt] = useState('');
  const [paramMode, setParamMode] = useState('');
  const [paramMap, setParamMap] = useState('');
  const [paramNotes, setParamNotes] = useState('');

  const [editScores, setEditScores] = useState<Record<number, { t1: string; t2: string }>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [proofs, setProofs] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, [matchId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle();
    setMatch(data as Match);
    
    if (data) {
      setScheduledAt(data.scheduled_at ? data.scheduled_at.substring(0, 16) : '');
      setParamMode(data.mode || '');
      setParamMap(data.map || '');
      setParamNotes(data.admin_notes || '');
    }

    const { data: sc } = await supabase
      .from('match_scores')
      .select('*')
      .eq('match_id', matchId)
      .order('manche_number');
    setScores((sc as MatchScore[]) ?? []);

    const { data: prfs } = await supabase
      .from('score_proofs')
      .select('*, submitted_by:profiles(cod_username)')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });
    setProofs(prfs ?? []);

    const { data: dspts } = await supabase
      .from('disputes')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'open');
    setDisputes(dspts ?? []);

    // Initialize edit state
    const init: Record<number, { t1: string; t2: string }> = {};
    for (let i = 1; i <= 5; i++) {
      const s = (sc as MatchScore[])?.find(x => x.manche_number === i);
      init[i] = { t1: s?.team1_score?.toString() ?? '', t2: s?.team2_score?.toString() ?? '' };
    }

    // Auto-fill from proof if no scores exist yet
    if ((!sc || sc.length === 0) && prfs && prfs.length > 0) {
      const latestProof = prfs[0];
      if (latestProof.team1_score !== undefined && latestProof.team2_score !== undefined && latestProof.team1_score !== null) {
        init[1] = {
          t1: latestProof.team1_score.toString(),
          t2: latestProof.team2_score.toString()
        };
      }
    }

    setEditScores(init);
    setScheduledAt(data?.scheduled_at ? data.scheduled_at.slice(0, 16) : '');
    setLoading(false);
  }

  async function saveScores(silent = false) {
    setSaving(true);
    setError('');
    try {
      for (let i = 1; i <= 5; i++) {
        const { t1, t2 } = editScores[i] ?? { t1: '', t2: '' };
        if (t1 === '' && t2 === '') continue;
        const t1n = parseInt(t1) || 0;
        const t2n = parseInt(t2) || 0;
        const existing = scores.find(s => s.manche_number === i);
        if (existing) {
          await supabase.from('match_scores').update({ team1_score: t1n, team2_score: t2n }).eq('id', existing.id);
        } else {
          await supabase.from('match_scores').insert({ match_id: matchId, manche_number: i, team1_score: t1n, team2_score: t2n });
        }
      }
      await logActivity('score_validated', { match: `${match?.team1_name} vs ${match?.team2_name}`, desc: `Score modifié par admin` });
      await load();
      if (!silent) {
        setSuccess('Scores mis à jour.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      if (!silent) setError('Erreur lors de la sauvegarde.');
    }
    setSaving(false);
  }

  async function logActivity(action: string, details: object) {
    await supabase.from('activity_logs').insert({ admin_id: profile?.id, action, details });
  }

  async function sendMatchNotification(title: string, message: string) {
    if (!match) return;
    const teamIds = [match.team1_id, match.team2_id].filter(Boolean) as string[];
    if (teamIds.length === 0) return;

    const { data: members } = await supabase
      .from('team_members')
      .select('profile_id')
      .in('team_id', teamIds)
      .eq('status', 'active');

    const profileIds = Array.from(new Set((members as { profile_id: string }[] ?? []).map(m => m.profile_id)));
    if (profileIds.length === 0) return;

    const notifications = profileIds.map(id => ({
      profile_id: id,
      title,
      message,
      type: 'match',
    }));

    await supabase.from('notifications').insert(notifications);
  }

  async function updateMatchStatus(status: string) {
    setSaving(true);
    await supabase.from('matches').update({ status }).eq('id', matchId);
    await logActivity('status_updated', { match: `${match?.team1_name} vs ${match?.team2_name}`, status });
    await sendMatchNotification(
      `Mise à jour du match`,
      `Le match ${match?.team1_name} vs ${match?.team2_name} a été mis à jour : ${status}.`
    );
    await load();
    setSuccess(`Statut mis à jour : ${status}`);
    setTimeout(() => setSuccess(''), 3000);
    setSaving(false);
  }

  async function advanceNextMatch() {
    if (!match?.next_match_id) return;
    setSaving(true);
    const { error } = await supabase
      .from('matches')
      .update({ status: 'scheduled' })
      .eq('id', match.next_match_id);

    if (error) {
      setError('Impossible de lancer le match suivant.');
      setSaving(false);
      return;
    }

    await logActivity('advance_next_match', { match: match.id, next_match_id: match.next_match_id });
    await sendMatchNotification(
      `Match suivant lancé`,
      `Le match suivant du bracket a été déclenché manuellement par l'administration.`
    );
    await load();
    setSuccess('Match suivant lancé.');
    setTimeout(() => setSuccess(''), 3000);
    setSaving(false);
  }

  async function saveParams() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await supabase.from('matches').update({
        mode: paramMode,
        map: paramMap,
        admin_notes: paramNotes,
        scheduled_at: scheduledAt || null
      }).eq('id', matchId);
      
      await load();
      setSuccess('Paramètres du match enregistrés.');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Erreur lors de la sauvegarde.');
    }
    setSaving(false);
  }

  async function resolveDispute() {
    setSaving(true);
    await supabase.from('disputes').update({ status: 'resolved' }).eq('match_id', matchId).eq('status', 'open');
    await validateScore(); // Uses the current t1W/t2W to close the match
  }

  async function validateScore() {
    if (!match) return;
    
    // Auto-save editScores before validating if they haven't been saved yet
    const hasUnsavedScores = Object.values(editScores).some(s => s.t1 !== '' || s.t2 !== '');
    if (hasUnsavedScores) {
      await saveScores(true); // pass true to suppress success toast from saveScores
    }

    // Determine winner based on the NEW scores array (we need to fetch it or compute it)
    // Wait, saveScores calls load() which updates 'scores' state asynchronously, 
    // but we need it immediately. Let's just compute from editScores directly to be safe and instant.
    let t1W = 0;
    let t2W = 0;
    for (let i = 1; i <= 3; i++) {
      const t1 = parseInt(editScores[i]?.t1) || 0;
      const t2 = parseInt(editScores[i]?.t2) || 0;
      if (t1 > t2) t1W++;
      if (t2 > t1) t2W++;
    }

    // Calculate and distribute points if it's a team match (not 1v1 Phase 2)
    if (match.format !== '1v1' && match.team1_id && match.team2_id) {
      let t1Points = 0;
      let t2Points = 0;
      if (t1W > t2W) {
        if (t1W - t2W >= 2) { t1Points = 3; t2Points = 0; }
        else { t1Points = 2; t2Points = 1; }
      } else if (t2W > t1W) {
        if (t2W - t1W >= 2) { t1Points = 0; t2Points = 3; }
        else { t1Points = 1; t2Points = 2; }
      }

      if (t1Points > 0 || t2Points > 0) {
        const { data: members } = await supabase
          .from('team_members')
          .select('profile_id, team_id')
          .in('team_id', [match.team1_id, match.team2_id])
          .eq('status', 'active');
        
        if (members && members.length > 0) {
          const profileIds = members.map(m => m.profile_id);
          const { data: entries } = await supabase
            .from('tournament_entries')
            .select('id, profile_id, team_points, team_id')
            .in('profile_id', profileIds);
          
          if (entries) {
            for (const entry of entries) {
              // Note: entry.team_id might not be populated if it's not a join, but we can check the members array
              const memberRecord = members.find(m => m.profile_id === entry.profile_id);
              const isTeam1 = memberRecord?.team_id === match.team1_id;
              const ptsToAdd = isTeam1 ? t1Points : t2Points;
              if (ptsToAdd > 0) {
                await supabase.from('tournament_entries')
                  .update({ team_points: (entry.team_points || 0) + ptsToAdd })
                  .eq('id', entry.id);
              }
            }
          }
        }
      }
    }

    const winnerId = t1W > t2W ? match.team1_id : t2W > t1W ? match.team2_id : null;
    const winnerName = t1W > t2W ? match.team1_name : t2W > t1W ? match.team2_name : null;
    
    setSaving(true);
    await supabase.from('matches').update({ status: 'completed', winner_id: winnerId }).eq('id', matchId);
    
    // Auto-advance winner for Bracket matches
    if (match.next_match_id && winnerId && winnerName) {
      const isOddMatch = match.match_order % 2 !== 0;
      const updateField = isOddMatch ? 'team1_id' : 'team2_id';
      const nameField = isOddMatch ? 'team1_name' : 'team2_name';
      
      const { data: nextMatchData } = await supabase.from('matches').select('team1_id, team2_id').eq('id', match.next_match_id).single();
      
      const updateObj: any = {
        [updateField]: winnerId,
        [nameField]: winnerName,
      };

      if (nextMatchData) {
        const otherTeamId = isOddMatch ? nextMatchData.team2_id : nextMatchData.team1_id;
        if (otherTeamId) {
           updateObj.status = 'scheduled';
        }
      }

      await supabase.from('matches').update(updateObj).eq('id', match.next_match_id);
      await logActivity('advance_next_match', { match: match.id, next_match_id: match.next_match_id });
    }
    
    await supabase.from('score_proofs').update({ status: 'approved' }).eq('match_id', matchId).eq('status', 'pending');
    await logActivity('score_validated', { match: `${match.team1_name} vs ${match.team2_name}`, desc: `Score validé : ${t1W}-${t2W}` });
    await sendMatchNotification(
      `Score validé`,
      `Le score du match ${match.team1_name} vs ${match.team2_name} a été validé par l'administration.`
    );
    await load();
    setSuccess('Score validé. Match terminé.');
    setTimeout(() => setSuccess(''), 3000);
    setSaving(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-ghost-gray text-sm font-barlow uppercase">Chargement...</div>
  );

  if (!match) return (
    <div className="text-center py-12 text-ghost-gray">
      <p className="font-barlow uppercase tracking-wider">Match introuvable</p>
    </div>
  );

  const t1Wins = scores.filter(s => s.team1_score > s.team2_score).length;
  const t2Wins = scores.filter(s => s.team2_score > s.team1_score).length;

  return (
    <div className="animate-slide-up">
      {/* Back */}
      <button
        onClick={() => onNavigate('admin-matchs')}
        className="flex items-center gap-2 text-ghost-gray hover:text-white transition-colors mb-6 font-barlow text-xs uppercase tracking-wider"
      >
        <ChevronLeft size={14} /> RETOUR
      </button>

      <div className="mb-6">
        <p className="section-title">ADMIN — GESTION DU MATCH</p>
        <h1 className="font-barlow font-black text-2xl text-white uppercase">
          {match.round_name} — {match.format}
        </h1>
      </div>

      {/* Match header */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-center gap-10 flex-wrap">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-ghost-gold/10 border border-ghost-gold/30 flex items-center justify-center mb-2">
              <span className="font-barlow font-black text-ghost-gold text-2xl">{match.team1_name?.[0] ?? '?'}</span>
            </div>
            <p className="font-barlow font-black text-white text-lg uppercase">{match.team1_name ?? 'TBD'}</p>
          </div>
          <div className="text-center">
            <p className="font-barlaw font-black text-ghost-gold text-4xl font-barlow font-black">{t1Wins} — {t2Wins}</p>
            <p className="text-ghost-gray text-xs font-barlow uppercase tracking-wider mt-1">Score actuel</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-ghost-gold/10 border border-ghost-gold/30 flex items-center justify-center mb-2">
              <span className="font-barlow font-black text-ghost-gold text-2xl">{match.team2_name?.[0] ?? '?'}</span>
            </div>
            <p className="font-barlow font-black text-white text-lg uppercase">{match.team2_name ?? 'TBD'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main panel */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex border-b border-ghost-border mb-6 overflow-x-auto whitespace-nowrap hide-scrollbar">
            {([
              { key: 'score', label: 'SCORE' },
              { key: 'params', label: 'PARAMÈTRES' },
              { key: 'history', label: 'HISTORIQUE' },
            ] as { key: ActiveTab; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-6 py-3 font-barlow font-black text-xs uppercase tracking-widest border-b-2 transition-all duration-200 ${
                  activeTab === key ? 'text-ghost-gold border-ghost-gold' : 'text-ghost-gray border-transparent hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'score' && (
            <div className="card p-6 overflow-x-auto">
              <table className="w-full min-w-[300px]">
                <thead>
                  <tr className="border-b border-ghost-border">
                    <th className="text-ghost-gray text-[10px] font-barlow uppercase tracking-wider text-left pb-2 w-24"></th>
                    <th className="text-white text-xs font-barlow font-black uppercase pb-2 text-center">
                      {match.team1_name?.substring(0, 12) ?? 'Team 1'}
                    </th>
                    <th className="text-white text-xs font-barlow font-black uppercase pb-2 text-center">
                      {match.team2_name?.substring(0, 12) ?? 'Team 2'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map(i => {
                    const ev = editScores[i] ?? { t1: '', t2: '' };
                    return (
                      <tr key={i} className="border-b border-ghost-border/30">
                        <td className="py-3 text-ghost-gray text-xs font-barlow pr-2">Manche {i}</td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            value={ev.t1}
                            onChange={e => setEditScores(prev => ({ ...prev, [i]: { ...prev[i], t1: e.target.value } }))}
                            placeholder="—"
                            className="input-dark text-center text-sm font-barlow font-black py-2 px-3 w-full"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            value={ev.t2}
                            onChange={e => setEditScores(prev => ({ ...prev, [i]: { ...prev[i], t2: e.target.value } }))}
                            placeholder="—"
                            className="input-dark text-center text-sm font-barlow font-black py-2 px-3 w-full"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-ghost-border bg-ghost-black/20">
                    <td className="py-3 text-ghost-gold text-xs font-barlow font-black uppercase">SCORE FINAL</td>
                    <td className={`py-3 text-xl font-barlow font-black text-center ${t1Wins >= t2Wins && scores.length > 0 ? 'text-ghost-gold' : 'text-white'}`}>
                      {t1Wins}
                    </td>
                    <td className={`py-3 text-xl font-barlow font-black text-center ${t2Wins > t1Wins ? 'text-ghost-gold' : 'text-white'}`}>
                      {t2Wins}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Litiges & Proofs */}
              {proofs.length > 0 && (
                <div className="mt-8">
                  <p className="font-barlow font-bold text-white text-sm uppercase mb-4 flex items-center gap-2">
                    <AlertCircle size={16} className={disputes.length > 0 ? "text-ghost-red" : "text-ghost-gold"} />
                    PREUVES ET LITIGES
                  </p>
                  
                  {disputes.length > 0 && (
                    <div className="bg-ghost-red/10 border border-ghost-red/30 p-4 mb-4 rounded-xl">
                      <p className="text-ghost-red font-barlow font-bold uppercase text-sm mb-1">Litige Ouvert !</p>
                      <p className="text-ghost-red text-xs mb-3">Les deux équipes ont soumis des scores différents. Veuillez vérifier les preuves, corriger le score ci-dessus, et résoudre le litige.</p>
                      <button onClick={resolveDispute} disabled={saving} className="btn-red text-xs py-2 px-4">
                        RÉSOUDRE LE LITIGE ET VALIDER LE SCORE
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {proofs.map(p => (
                      <div key={p.id} className="border border-ghost-border p-4 bg-ghost-black/40">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-barlow font-bold text-white text-xs">{p.submitted_by?.cod_username ?? 'Joueur'} <span className="text-ghost-gray text-[10px]">({p.team_side === 'team1' ? match.team1_name : match.team2_name})</span></p>
                          <span className={`text-[10px] font-barlow font-bold px-2 py-0.5 uppercase border ${p.status === 'approved' ? 'border-ghost-green text-ghost-green bg-ghost-green/10' : p.status === 'rejected' ? 'border-ghost-red text-ghost-red bg-ghost-red/10' : 'border-ghost-gold text-ghost-gold bg-ghost-gold/10'}`}>
                            {p.status}
                          </span>
                        </div>
                        {p.team1_score !== undefined && p.team2_score !== undefined && (
                          <p className="text-ghost-gray text-xs mb-2">Score déclaré : <span className="font-bold text-white">{p.team1_score} - {p.team2_score}</span></p>
                        )}
                        {p.comment && <p className="text-ghost-gray text-xs italic mb-2 whitespace-pre-wrap">"{p.comment}"</p>}
                        <div className="flex flex-col gap-1 mt-2">
                          {p.file_url.split(',').map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-ghost-gold text-xs underline font-barlow hover:text-white transition-colors">
                              Voir la preuve jointe {p.file_url.includes(',') ? `#${i+1}` : ''}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'params' && (
            <div className="card p-6 space-y-4">
              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Mode de jeu</label>
                {match?.format === '4v4' ? (
                  <select
                    value={paramMode}
                    onChange={e => setParamMode(e.target.value)}
                    className="input-dark w-full appearance-none"
                  >
                    <option value="">Sélectionnez un mode...</option>
                    <option value="Élimination confirmée">Élimination confirmée</option>
                    <option value="Domination">Domination</option>
                    <option value="Match à mort par équipe">Match à mort par équipe</option>
                    <option value="Recherche et destruction">Recherche et destruction</option>
                    <option value="Capture du drapeau">Capture du drapeau</option>
                    <option value="Point stratégique">Point stratégique</option>
                    <option value="Ligne de front">Ligne de front</option>
                  </select>
                ) : (
                  <input
                    value={paramMode}
                    onChange={e => setParamMode(e.target.value)}
                    placeholder="Ex: Mode de jeu"
                    className="input-dark w-full"
                  />
                )}
              </div>
              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Carte</label>
                <input
                  value={paramMap}
                  onChange={e => setParamMap(e.target.value)}
                  placeholder="Ex: Carte"
                  className="input-dark"
                />
              </div>
              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Horaire du match</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="input-dark"
                />
                <p className="text-ghost-gray text-[10px] mt-2">Choisissez une heure de soirée pour le match.</p>
              </div>
              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Notes admin</label>
                <textarea
                  value={paramNotes}
                  onChange={e => setParamNotes(e.target.value)}
                  rows={3}
                  className="input-dark resize-none"
                />
              </div>
              <div className="pt-4 border-t border-ghost-border mt-4">
                <button 
                  onClick={saveParams}
                  disabled={saving}
                  className="btn-gold text-xs py-3 w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check size={14} /> ENREGISTRER LES PARAMÈTRES
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="card p-6">
              <p className="text-ghost-gray text-sm font-barlow uppercase tracking-wider text-center py-8">
                Historique des modifications à venir
              </p>
            </div>
          )}

          {(error || success) && (
            <div className={`mt-4 flex items-center gap-2 px-4 py-3 ${error ? 'bg-ghost-red/10 border-ghost-red/30 text-ghost-red' : 'bg-ghost-green/10 border-ghost-green/30 text-ghost-green'} border`}>
              {error ? <AlertCircle size={14} /> : <Check size={14} />}
              <span className="text-xs">{error || success}</span>
            </div>
          )}
        </div>

        {/* Actions panel */}
        <div>
          <p className="section-title mb-4">ACTIONS</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={validateScore}
              disabled={saving}
              className="btn-gold text-xs py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check size={14} /> VALIDER LE SCORE
            </button>
            <button
              onClick={() => saveScores()}
              disabled={saving}
              className="btn-dark text-xs py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Edit2 size={14} /> MODIFIER LE SCORE
            </button>
            <button
              onClick={() => updateMatchStatus('forfeit')}
              disabled={saving}
              className="btn-red text-xs py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Flag size={14} /> DÉCLARER FORFAIT
            </button>
            <button
              onClick={() => updateMatchStatus('postponed')}
              disabled={saving}
              className="btn-outline text-xs py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Calendar size={14} /> REPROGRAMMER
            </button>
            {match.next_match_id && match.status === 'completed' && (
              <button
                onClick={() => advanceNextMatch()}
                disabled={saving}
                className="btn-dark text-xs py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Clock size={14} /> MATCH SUIVANT
              </button>
            )}
            {!match.next_match_id && match.round_order === 4 && match.status === 'completed' && (
              <button
                onClick={async () => {
                  setSaving(true);
                  await supabase.from('schedule_config').upsert({ type: 'champion_reveal', config: { announced: true } });
                  setSuccess('Champion annoncé publiquement !');
                  setTimeout(() => setSuccess(''), 3000);
                  setSaving(false);
                }}
                disabled={saving}
                className="btn-gold text-xs py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trophy size={14} /> ANNONCER LE CHAMPION
              </button>
            )}
            <button
              onClick={() => {
                if (confirm('Confirmer la disqualification ?')) updateMatchStatus('forfeit');
              }}
              disabled={saving}
              className="text-ghost-red border border-ghost-red/30 font-barlow font-bold uppercase tracking-widest text-xs py-3 flex items-center justify-center gap-2 hover:bg-ghost-red/10 transition-all duration-200 disabled:opacity-50"
            >
              <XCircle size={14} /> DISQUALIFIER
            </button>
          </div>

          {/* Match status */}
          <div className="mt-6 card p-4">
            <p className="section-title mb-3">STATUT</p>
            <div className="flex flex-col gap-2">
              {['scheduled', 'live', 'completed', 'postponed'].map(s => (
                <button
                  key={s}
                  onClick={() => updateMatchStatus(s)}
                  className={`text-xs py-2 px-3 font-barlow font-bold uppercase tracking-wider text-left transition-all duration-200 border ${
                    match.status === s
                      ? s === 'live' ? 'border-ghost-red bg-ghost-red/10 text-ghost-red'
                      : s === 'completed' ? 'border-ghost-green bg-ghost-green/10 text-ghost-green'
                      : 'border-ghost-gold bg-ghost-gold/10 text-ghost-gold'
                      : 'border-ghost-border text-ghost-gray hover:border-ghost-gold/30 hover:text-white'
                  }`}
                >
                  {s === 'scheduled' ? 'À venir' : s === 'live' ? 'En cours' : s === 'completed' ? 'Terminé' : 'Reporté'}
                  {match.status === s && <span className="ml-2 text-[8px]">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
