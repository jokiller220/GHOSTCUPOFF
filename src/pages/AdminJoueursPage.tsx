import { useEffect, useState } from 'react';
import { Users, Search, Crown, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile, Team, TeamStatus } from '../types';
import { AdminTeamModal } from '../components/AdminTeamModal';

interface LeaderboardEntry {
  profile_id: string;
  rank: number;
  cod_username: string;
  team_name: string;
  team_pts: number;
  solo_pts: number;
  total_pts: number;
  diff: string;
  qualified: boolean;
}

export default function AdminJoueursPage() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tab, setTab] = useState<'players' | 'teams' | 'leaderboard'>('players');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    
    // We always need players for the Teams tab (AdminTeamModal needs allPlayers)
    const { data: playersData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'player')
      .order('created_at', { ascending: false });
    
    setPlayers((playersData as Profile[]) ?? []);

    if (tab === 'leaderboard') {
      const { data } = await supabase
        .from('tournament_entries')
        .select('*, profile:profiles(cod_username), team:teams(name)')
        .order('total_points', { ascending: false })
        .order('team_points', { ascending: false })
        .order('solo_points', { ascending: false });
        
      const entries = (data as any[] ?? []).map((entry, index) => ({
        profile_id: entry.profile_id,
        rank: index + 1,
        cod_username: entry.profile?.cod_username ?? 'INCONNU',
        team_name: entry.team?.name ?? 'Solo',
        team_pts: entry.team_points ?? 0,
        solo_pts: entry.solo_points ?? 0,
        total_pts: entry.total_points ?? 0,
        diff: entry.total_points != null ? `${entry.total_points - (entry.team_points ?? 0) - (entry.solo_points ?? 0)}` : '0',
        qualified: entry.qualified ?? false,
      }));
      setLeaderboard(entries);
    } else if (tab === 'teams') {
      const { data } = await supabase
        .from('teams')
        .select('*, captain:profiles(cod_username), members:team_members(*)')
        .order('created_at', { ascending: false });
      setTeams((data as Team[]) ?? []);
    }
    setLoading(false);
  }

  const filteredPlayers = players.filter(p =>
    p.cod_username.toLowerCase().includes(search.toLowerCase()) ||
    p.real_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  async function promoteAdmin(id: string) {
    if (!confirm('Promouvoir ce joueur en admin ?')) return;
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', id);
    load();
  }

  async function toggleQualification(profile_id: string, currentState: boolean) {
    const newState = !currentState;
    setLeaderboard(prev => prev.map(p => p.profile_id === profile_id ? { ...p, qualified: newState } : p));
    const { error } = await supabase.from('tournament_entries').update({ qualified: newState }).eq('profile_id', profile_id);
    if (error) {
      setError('Erreur lors de la qualification.');
      setLeaderboard(prev => prev.map(p => p.profile_id === profile_id ? { ...p, qualified: currentState } : p));
    }
  }

  async function autoQualifyTop16() {
    if (!window.confirm('Voulez-vous vraiment qualifier automatiquement les 16 premiers du classement actuel et disqualifier les autres ?')) return;
    setSaving(true);
    setError('');
    
    // Set qualified = true for top 16, false for others in UI
    const updatedLeaderboard = leaderboard.map((p, idx) => ({ ...p, qualified: idx < 16 }));
    setLeaderboard(updatedLeaderboard);
    
    const top16Ids = updatedLeaderboard.filter(p => p.qualified).map(p => p.profile_id);
    const othersIds = updatedLeaderboard.filter(p => !p.qualified).map(p => p.profile_id);

    if (top16Ids.length > 0) {
      await supabase.from('tournament_entries').update({ qualified: true }).in('profile_id', top16Ids);
    }
    if (othersIds.length > 0) {
      await supabase.from('tournament_entries').update({ qualified: false }).in('profile_id', othersIds);
    }
    
    setSuccess('Le top 16 a été qualifié automatiquement !');
    setTimeout(() => setSuccess(''), 4000);
    setSaving(false);
  }

  const STATUS_COLORS: Record<string, string> = {
    forming: 'text-ghost-gray border-ghost-border',
    registered: 'text-ghost-gold border-ghost-gold/40',
    active: 'text-ghost-green border-ghost-green/40',
    eliminated: 'text-ghost-red border-ghost-red/40',
    champion: 'text-ghost-gold border-ghost-gold',
  };

  async function updateTeamStatus(teamId: string, status: TeamStatus) {
    await supabase.from('teams').update({ status }).eq('id', teamId);
    load();
  }

  const [saving, setSaving] = useState(false);

  async function autoDistributePlayers() {
    if (!window.confirm('Clôturer les inscriptions et répartir automatiquement les joueurs sans équipe ?')) return;
    setSaving(true);
    setError('');
    setSuccess('');
    
    const { data: allPlayers } = await supabase.from('profiles').select('id, cod_username').eq('role', 'player');
    const { data: allTeams } = await supabase.from('teams').select('id, name, status, format, members:team_members(profile_id, status)').eq('format', '4v4');
    
    const incompleteTeams = allTeams?.filter(t => t.members.length < 4) || [];
    
    const playersInTeams = new Set<string>();
    allTeams?.forEach(t => t.members.forEach((m: any) => playersInTeams.add(m.profile_id)));
    let isolatedPlayers = allPlayers?.filter(p => !playersInTeams.has(p.id)) || [];
    
    // Shuffle the isolated players randomly
    isolatedPlayers.sort(() => Math.random() - 0.5);
    
    for (const team of incompleteTeams) {
      let needed = 4 - team.members.length;
      while (needed > 0 && isolatedPlayers.length > 0) {
        const p = isolatedPlayers.pop();
        if (p) {
          const { error } = await supabase.from('team_members').insert({ team_id: team.id, profile_id: p.id, status: 'active' });
          if (error) {
            setError(`Erreur (team_members): ${error.message}`);
            setSaving(false);
            return;
          }
          needed--;
        }
      }
      if (needed === 0) {
        await supabase.from('teams').update({ status: 'registered' }).eq('id', team.id);
      }
    }
    
    for (let i = 0; i < isolatedPlayers.length; i += 4) {
      const group = isolatedPlayers.slice(i, i + 4);
      const captain = group[0];
      const isComplete = group.length === 4;
      
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const { data: newTeam, error } = await supabase.from('teams').insert({
        name: `Équipe ${captain.cod_username} #${randomSuffix}`,
        captain_id: captain.id,
        format: '4v4',
        status: isComplete ? 'registered' : 'forming'
      }).select().single();

      if (error) {
        setError(`Erreur de sécurité (RLS) lors de la création d'équipe: ${error.message}`);
        setSaving(false);
        return;
      }

      if (newTeam) {
        const membersToInsert = group.map(p => ({ team_id: newTeam.id, profile_id: p.id, status: 'active' }));
        const { error: memberError } = await supabase.from('team_members').insert(membersToInsert);
        if (memberError) {
           setError(`Erreur membre: ${memberError.message}`);
           setSaving(false);
           return;
        }
      }
    }

    await load();
    setSaving(false);
    
    if (isolatedPlayers.length === 0) {
      setSuccess("Aucun joueur orphelin à répartir !");
    } else {
      setSuccess(`${isolatedPlayers.length} joueurs ont été répartis !`);
    }
    setTimeout(() => setSuccess(''), 4000);
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="section-title">ADMIN</p>
          <h1 className="font-barlow font-black text-3xl text-white uppercase">JOUEURS & ÉQUIPES</h1>
        </div>
        <button
          onClick={autoDistributePlayers}
          disabled={saving}
          className="btn-gold text-xs py-2 px-4 flex items-center gap-2 uppercase tracking-widest disabled:opacity-50"
        >
          {saving ? <RefreshCw size={12} className="animate-spin" /> : <Users size={12} />}
          Clôturer & Répartir
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-ghost-red/10 border border-ghost-red/30 text-ghost-red px-4 py-3 rounded text-xs font-barlow">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-ghost-green/10 border border-ghost-green/30 text-ghost-green px-4 py-3 rounded text-xs font-barlow">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-ghost-border mb-6">
        {[
          { key: 'players', label: `JOUEURS (${players.length})` },
          { key: 'teams', label: `ÉQUIPES (${teams.length})` },
          { key: 'leaderboard', label: 'CLASSEMENT & QUALIFS' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`px-6 py-3 font-barlow font-black text-xs uppercase tracking-widest border-b-2 transition-all ${
              tab === key ? 'text-ghost-gold border-ghost-gold' : 'text-ghost-gray border-transparent hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ghost-gray" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="input-dark pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-ghost-gray">
          <RefreshCw size={16} className="animate-spin" />
        </div>
      ) : tab === 'players' ? (
        <div className="space-y-2">
          {filteredPlayers.map(p => (
            <div key={p.id} className="card px-5 py-4 flex items-center gap-4 flex-wrap">
              <div className="w-8 h-8 bg-ghost-gold/10 border border-ghost-gold/20 flex items-center justify-center shrink-0">
                <span className="font-barlow font-black text-ghost-gold text-xs">{p.cod_username[0]}</span>
              </div>
              <div className="flex-1">
                <p className="font-barlow font-bold text-white text-sm">{p.cod_username}</p>
                <p className="text-ghost-gray text-xs">{p.real_name}</p>
              </div>
              <span className={`text-[9px] font-barlow font-bold uppercase border px-2 py-0.5 ${p.role === 'admin' ? 'text-ghost-red border-ghost-red/40' : 'text-ghost-gray border-ghost-border'}`}>
                {p.role}
              </span>
              <span className="text-ghost-gray text-[10px]">
                {new Date(p.created_at).toLocaleDateString('fr-FR')}
              </span>
              {p.role === 'player' && (
                <button onClick={() => promoteAdmin(p.id)} className="btn-outline text-[9px] py-1 px-2">
                  PROMOUVOIR
                </button>
              )}
            </div>
          ))}
          {filteredPlayers.length === 0 && (
            <div className="card p-10 text-center">
              <Users size={28} className="mx-auto mb-3 text-ghost-gray/30" />
              <p className="font-barlow text-ghost-gray text-sm uppercase tracking-wider">Aucun joueur trouvé</p>
            </div>
          )}
        </div>
      ) : tab === 'leaderboard' ? (
        <div className="space-y-4">
          <div className="card p-4 flex items-center justify-between mb-4 bg-ghost-gold/10 border-ghost-gold/30">
            <div>
              <h3 className="font-barlow font-black text-ghost-gold uppercase">Gérer les qualifiés</h3>
              <p className="text-ghost-gray text-xs">Cochez les 16 meilleurs joueurs pour les qualifier au bracket 1v1.</p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={autoQualifyTop16}
                disabled={saving}
                className="btn-outline text-xs py-2 px-4 uppercase flex items-center gap-2 disabled:opacity-50"
              >
                <Crown size={12} className="text-ghost-gold" />
                AUTOSÉLECTIONNER TOP 16
              </button>
              <div className="text-center border-l border-ghost-gold/20 pl-6">
                <span className="block font-barlow font-black text-2xl text-white">{leaderboard.filter(l => l.qualified).length} / 16</span>
                <span className="text-ghost-gray text-[10px] uppercase tracking-widest">Qualifiés</span>
              </div>
            </div>
          </div>
          
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-ghost-gray uppercase bg-ghost-black/40 border-b border-ghost-border">
                  <tr>
                    <th className="px-4 py-3 text-center w-16">Rang</th>
                    <th className="px-4 py-3">Joueur</th>
                    <th className="px-4 py-3 text-center">Pts Équipe</th>
                    <th className="px-4 py-3 text-center">Pts Solo</th>
                    <th className="px-4 py-3 text-center font-bold text-ghost-gold">Total</th>
                    <th className="px-4 py-3 text-center w-24">Qualifié</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ghost-border">
                  {leaderboard.map(player => (
                    <tr key={player.profile_id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-center font-barlow font-black">
                        <span className={`flex items-center justify-center w-6 h-6 mx-auto rounded-full ${player.rank <= 16 ? 'bg-ghost-gold text-black' : 'bg-ghost-dark text-ghost-gray'}`}>
                          {player.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-barlow font-bold text-white">{player.cod_username}</p>
                        <p className="text-[10px] text-ghost-gray">{player.team_name}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-ghost-gray">{player.team_pts}</td>
                      <td className="px-4 py-3 text-center text-ghost-gray">{player.solo_pts}</td>
                      <td className="px-4 py-3 text-center font-barlow font-bold text-ghost-gold">{player.total_pts}</td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => toggleQualification(player.profile_id, player.qualified)}
                          className={`w-6 h-6 rounded border flex items-center justify-center mx-auto transition-colors ${player.qualified ? 'bg-ghost-gold border-ghost-gold text-black' : 'border-ghost-border hover:border-ghost-gold/50'}`}
                        >
                          {player.qualified && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTeams.map(t => (
            <div key={t.id} className="card px-5 py-4 flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 bg-ghost-gold/10 border border-ghost-gold/20 flex items-center justify-center shrink-0">
                <span className="font-barlow font-black text-ghost-gold text-lg">{t.name[0]}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-barlow font-bold text-white text-sm">{t.name}</p>
                  <Crown size={10} className="text-ghost-gold" />
                  <span className="text-ghost-gray text-xs">{(t.captain as Profile | undefined)?.cod_username ?? '—'}</span>
                </div>
                <p className="text-ghost-gray text-xs">
                  {t.format.toUpperCase()} · Code: {t.invite_code} · Membres: {(t.members ?? []).filter(m => m.status !== 'kicked').length}/{t.format === '4v4' ? 4 : 1}
                </p>
              </div>
              <span className={`text-[9px] font-barlow font-bold uppercase border px-2 py-0.5 ${STATUS_COLORS[t.status] ?? 'text-ghost-gray border-ghost-border'}`}>
                {t.status}
              </span>
              <button 
                onClick={() => setSelectedTeam(t)}
                className="btn-outline text-[10px] py-1 px-3 ml-2"
              >
                ÉDITER
              </button>
              <div className="flex flex-col gap-2 mt-3 w-full sm:w-auto">
                {t.status === 'forming' && (
                  <button
                    onClick={() => updateTeamStatus(t.id, 'registered')}
                    className="btn-outline text-[10px] py-2 px-3 w-full"
                  >
                    FORCER INSCRIPTION
                  </button>
                )}
                {t.status === 'registered' && (
                  <button
                    onClick={() => updateTeamStatus(t.id, 'active')}
                    className="btn-gold text-[10px] py-2 px-3 w-full"
                  >
                    ACTIVER L'ÉQUIPE
                  </button>
                )}
                {t.status === 'active' && (
                  <button
                    onClick={() => updateTeamStatus(t.id, 'eliminated')}
                    className="btn-red text-[10px] py-2 px-3 w-full"
                  >
                    DÉCLARER ÉLIMINÉ
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredTeams.length === 0 && (
            <div className="card p-10 text-center">
              <Users size={28} className="mx-auto mb-3 text-ghost-gray/30" />
              <p className="font-barlow text-ghost-gray text-sm uppercase tracking-wider">Aucune équipe trouvée</p>
            </div>
          )}
        </div>
      )}

      {selectedTeam && (
        <AdminTeamModal 
          team={selectedTeam} 
          allPlayers={players} 
          onClose={() => setSelectedTeam(null)} 
          onUpdate={() => {
            load();
            setSelectedTeam(null);
          }} 
        />
      )}
    </div>
  );
}
