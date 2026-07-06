import { useEffect, useState } from 'react';
import { Users, Search, Crown, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile, Team, TeamStatus } from '../types';
import { AdminTeamModal } from '../components/AdminTeamModal';

export default function AdminJoueursPage() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tab, setTab] = useState<'players' | 'teams'>('players');
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
      .order('created_at', { ascending: false });
    
    setPlayers((playersData as Profile[]) ?? []);

    if (tab === 'teams') {
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
