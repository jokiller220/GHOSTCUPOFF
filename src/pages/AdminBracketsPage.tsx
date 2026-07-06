import { useEffect, useState } from 'react';
import { RefreshCw, GitBranch } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateBracketMatches, generateRoundRobinSchedule, generateSoloLobbyRounds, SoloLobbyRound } from '../lib/tournament';
import { Match, Format, Page } from '../types';
import BracketTree from '../components/BracketTree';

interface AdminBracketsPageProps {
  onNavigate: (page: Page, data?: unknown) => void;
}

export default function AdminBracketsPage({ onNavigate }: AdminBracketsPageProps) {
  const [format, setFormat] = useState<Format>('4v4');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soloLobbyRounds, setSoloLobbyRounds] = useState<SoloLobbyRound[] | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('matches')
      .select('*, scores:match_scores(*)')
      .eq('format', format)
      .order('round_order')
      .order('match_order');
    setMatches((data as Match[]) ?? []);
    setLoading(false);
  }

  async function advanceBracketPhase() {
    setLoading(true);
    setMessage(null);
    setError(null);
    const { data } = await supabase
      .from('matches')
      .select('id')
      .eq('format', format)
      .eq('status', 'postponed');

    const ids = (data as { id: string }[] ?? []).map(item => item.id);
    if (ids.length > 0) {
      await supabase.from('matches').update({ status: 'scheduled' }).in('id', ids);
    }

    await load();
  }

  async function createRoundRobinSchedule() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const [{ data: teamsData, error: teamsError }, { data: configData }] = await Promise.all([
      supabase.from('teams').select('id, name').eq('format', '4v4').eq('status', 'active').order('created_at', { ascending: true }).limit(6),
      supabase.from('schedule_config').select('config').eq('type', 'round_robin').single()
    ]);

    const teams = (teamsData as { id: string; name: string }[] | null) ?? [];
    if (teams.length !== 6 || teamsError) {
      setError('6 équipes actives 4v4 sont nécessaires pour créer le round robin.');
      setLoading(false);
      return;
    }

    const schedule = generateRoundRobinSchedule(
      teams.map(team => ({ id: team.id, name: team.name })),
      configData?.config?.dates || []
    );
    
    const { error: insertError, data: insertedMatches } = await supabase.from('matches').insert(schedule).select();
    if (insertError) {
      setError('Échec de la génération du planning round robin.');
    } else {
      setMessage('Planning round robin 4v4 généré avec succès.');
      
      // Notify players
      const teamIds = teams.map(t => t.id);
      const { data: members } = await supabase.from('team_members').select('profile_id').in('team_id', teamIds).eq('status', 'active');
      if (members) {
        const notifications = members.map(m => ({
          profile_id: m.profile_id,
          type: 'system',
          title: 'Nouveau Round !',
          message: 'Les matchs de poule (Round Robin 4v4) ont été générés. Consultez le planning.'
        }));
        await supabase.from('notifications').insert(notifications);
      }

      await load();
    }
    setLoading(false);
  }

  async function createBracketMatches() {
    setLoading(true);
    setMessage(null);
    setError(null);
    setSoloLobbyRounds(null);

    const [{ data: qualifierData, error: qualifierError }, { data: configData }] = await Promise.all([
      supabase.from('tournament_entries')
        .select('profile_id, team_id, profile:profiles(cod_username), team:teams(name)')
        .eq('qualified', true)
        .order('total_points', { ascending: false })
        .limit(16),
      supabase.from('schedule_config').select('config').eq('type', 'bracket').single()
    ]);

    const qualifiersRaw = (qualifierData as any[] | null) ?? [];
    const qualifiers = qualifiersRaw
      .map((entry) => {
        const id = entry.profile_id ?? entry.team_id;
        const name = entry.profile?.cod_username ?? entry.team?.name ?? `Qualifié ${id ?? '—'}`;
        return id ? { id, name } : null;
      })
      .filter(Boolean) as { id: string; name: string }[];

    if (qualifierError || qualifiers.length < 16) {
      setError('16 qualifiés sont nécessaires pour générer le bracket final.');
      setLoading(false);
      return;
    }

    const bracketMatches = generateBracketMatches(qualifiers, configData?.config?.dates || []);
    const { error: insertError } = await supabase.from('matches').insert(bracketMatches);
    if (insertError) {
      setError('Échec de la génération du bracket final.');
    } else {
      setMessage('Bracket final 1v1 généré avec succès.');

      // Notify Top 16 players
      const profileIds = qualifiersRaw.map(q => q.profile_id).filter(Boolean);
      if (profileIds.length > 0) {
        const notifications = profileIds.map(id => ({
          profile_id: id,
          type: 'system',
          title: 'Félicitations !',
          message: 'Vous êtes qualifié dans le TOP 16 ! Le bracket final 1v1 vient d\'être généré.'
        }));
        await supabase.from('notifications').insert(notifications);
      }

      await load();
    }
    setLoading(false);
  }

  async function previewSoloLobbies() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const { data, error: playerError } = await supabase
      .from('profiles')
      .select('id, cod_username, team_members(team_id, status)')
      .eq('role', 'player')
      .order('created_at', { ascending: true })
      .limit(24);

    const players = (data as any[] | null) ?? [];
    if (playerError || players.length < 2) {
      setError('Impossible de récupérer les joueurs pour les lobbys.');
      setLoading(false);
      return;
    }

    const rounds = generateSoloLobbyRounds(players.map((player) => {
      const activeTeam = player.team_members?.find((m: any) => m.status === 'active');
      return { id: player.id, name: player.cod_username, team_id: activeTeam?.team_id || null };
    }));
    
    setSoloLobbyRounds(rounds);
    setMessage('Prévisualisation des lobbys solo générée avec l\'algorithme anti-collusion.');
    setLoading(false);
  }

  useEffect(() => { load(); }, [format]);

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="section-title">ADMIN</p>
          <h1 className="font-barlow font-black text-3xl text-white uppercase">BRACKETS</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={advanceBracketPhase} className="btn-outline text-xs py-2 px-4 flex items-center gap-2">
            <GitBranch size={12} /> FORCER AVANCEMENT
          </button>
          <button onClick={load} className="btn-outline text-xs py-2 px-4 flex items-center gap-2">
            <RefreshCw size={12} /> ACTUALISER
          </button>
        </div>
      </div>
      {(message || error) && (
        <div className="mb-6 space-y-2">
          {message && (
            <div className="rounded-2xl border border-ghost-green/30 bg-ghost-green/10 px-4 py-3 text-ghost-green text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-ghost-red/30 bg-ghost-red/10 px-4 py-3 text-ghost-red text-sm">
              {error}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3 mb-6">
        {format === '4v4' ? (
          <button onClick={createRoundRobinSchedule} className="btn-gold text-xs py-2 px-4 uppercase tracking-widest">
            Générer round robin 4v4
          </button>
        ) : (
          <button onClick={createBracketMatches} className="btn-gold text-xs py-2 px-4 uppercase tracking-widest">
            Générer bracket 1v1
          </button>
        )}
        <button onClick={previewSoloLobbies} className="btn-outline text-xs py-2 px-4 uppercase tracking-widest">
          Prévisualiser lobbys solo
        </button>
      </div>

      {soloLobbyRounds && (
        <div className="mb-6 space-y-4">
          <div className="rounded-3xl border border-ghost-border p-4 bg-ghost-card/80">
            <p className="font-barlow font-black text-white uppercase text-xs tracking-widest mb-2">Aperçu des lobbys solo</p>
            <div className="grid gap-3 md:grid-cols-2">
              {soloLobbyRounds.map((round) => (
                <div key={round.round} className="rounded-2xl border border-ghost-border/50 bg-ghost-dark p-3">
                  <p className="font-barlow font-bold text-ghost-gold uppercase text-[11px] tracking-[0.25em] mb-3">Partie {round.round}</p>
                  <div className="space-y-2">
                    {round.lobbies.map((lobby) => (
                      <div key={lobby.name} className="rounded-2xl border border-ghost-border/30 bg-black/20 p-3">
                        <p className="text-ghost-gray text-[10px] uppercase tracking-wider mb-2">{lobby.name}</p>
                        <div className="grid grid-cols-2 gap-2 text-white text-xs font-barlow">
                          {lobby.players.map((player) => (
                            <div key={player.id} className="rounded-lg bg-ghost-black/70 p-2 truncate">{player.name}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Format tabs */}
      <div className="flex border-b border-ghost-border mb-6">
        {(['4v4', '1v1'] as Format[]).map(f => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`px-8 py-3 font-barlow font-black text-xs uppercase tracking-widest border-b-2 transition-all ${
              format === f ? 'text-ghost-gold border-ghost-gold' : 'text-ghost-gray border-transparent hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-ghost-gray">
          <RefreshCw size={16} className="animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <div className="card p-12 text-center">
          <GitBranch size={32} className="mx-auto mb-3 text-ghost-gray/30" />
          <p className="font-barlow text-ghost-gray text-sm uppercase tracking-wider mb-4">Aucun bracket généré</p>
        </div>
      ) : (
        <div className="card p-6 overflow-hidden">
          <BracketTree
            matches={matches}
            onMatchClick={m => onNavigate('admin-match-detail', m.id)}
          />
        </div>
      )}
    </div>
  );
}
