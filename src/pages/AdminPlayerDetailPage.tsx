import { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Save, User, Activity, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Page, Profile, TournamentEntry, Match } from '../types';

interface Props {
  playerId: string;
  onNavigate: (page: Page, data?: unknown) => void;
}

export default function AdminPlayerDetailPage({ playerId, onNavigate }: Props) {
  const [player, setPlayer] = useState<Profile | null>(null);
  const [stats, setStats] = useState<TournamentEntry | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [codUsername, setCodUsername] = useState('');
  const [realName, setRealName] = useState('');

  useEffect(() => {
    loadPlayer();
  }, [playerId]);

  async function loadPlayer() {
    setLoading(true);
    
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', playerId)
      .single();
      
    if (profile) {
      setPlayer(profile as Profile);
      setCodUsername(profile.cod_username);
      setRealName(profile.real_name);
    } else {
      setError("Joueur introuvable.");
      setLoading(false);
      return;
    }

    // Fetch stats
    const { data: entry } = await supabase
      .from('tournament_entries')
      .select('*')
      .eq('profile_id', playerId)
      .single();
    if (entry) setStats(entry as TournamentEntry);

    // Fetch matches (where user is part of a team or solo)
    const { data: m1 } = await supabase.from('matches').select('*').eq('team1_id', playerId);
    const { data: m2 } = await supabase.from('matches').select('*').eq('team2_id', playerId);
    
    // If player is in a team, get team matches
    const { data: tm } = await supabase.from('team_members').select('team_id').eq('profile_id', playerId).single();
    if (tm) {
      const { data: tM1 } = await supabase.from('matches').select('*').eq('team1_id', tm.team_id);
      const { data: tM2 } = await supabase.from('matches').select('*').eq('team2_id', tm.team_id);
      
      const allMatches = [...(m1 || []), ...(m2 || []), ...(tM1 || []), ...(tM2 || [])];
      // unique matches
      const uniqueIds = new Set();
      const uniqueMatches = allMatches.filter(m => {
        if (uniqueIds.has(m.id)) return false;
        uniqueIds.add(m.id);
        return true;
      });
      
      uniqueMatches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMatches(uniqueMatches as Match[]);
    } else {
      const allMatches = [...(m1 || []), ...(m2 || [])];
      allMatches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMatches(allMatches as Match[]);
    }

    setLoading(false);
  }

  async function saveChanges() {
    setSaving(true);
    setError('');
    setSuccess('');

    const { error } = await supabase
      .from('profiles')
      .update({
        cod_username: codUsername,
        real_name: realName
      })
      .eq('id', playerId);

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Profil mis à jour avec succès.");
      setPlayer(prev => prev ? { ...prev, cod_username: codUsername, real_name: realName } : null);
    }
    setSaving(false);
  }

  async function deletePlayer() {
    if (!window.confirm(`⚠️ ATTENTION ⚠️\n\nVoulez-vous vraiment supprimer définitivement ce compte ?\nCette action va : \n- Supprimer le joueur de sa team\n- Détruire son compte (auth.users)\n- Il ne pourra plus se connecter.`)) return;
    
    setDeleting(true);
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: playerId });
    
    if (error) {
      // If RPC fails (maybe not implemented yet or RLS), try local delete (which will fail for auth.users but can try)
      alert("Erreur lors de la suppression : " + error.message + "\nAssurez-vous d'avoir exécuté la migration SQL dans l'éditeur Supabase.");
      setDeleting(false);
    } else {
      alert("Joueur supprimé définitivement.");
      onNavigate('admin-joueurs');
    }
  }

  if (loading) {
    return (
      <div className="animate-slide-up flex flex-col items-center justify-center h-48 text-ghost-gray">
        <Activity size={24} className="animate-spin mb-4" />
        <p className="font-barlow text-sm uppercase">Chargement du profil...</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="animate-slide-up">
        <button onClick={() => onNavigate('admin-joueurs')} className="flex items-center gap-2 text-ghost-gray hover:text-white mb-6 transition-colors">
          <ArrowLeft size={16} /> Retour aux joueurs
        </button>
        <div className="card p-8 text-center text-ghost-red font-barlow">
          Joueur introuvable.
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <button onClick={() => onNavigate('admin-joueurs')} className="flex items-center gap-2 text-ghost-gray hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} /> Retour aux joueurs
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-ghost-gold/10 border border-ghost-gold/30 rounded-full flex items-center justify-center">
          <User size={24} className="text-ghost-gold" />
        </div>
        <div>
          <p className="section-title">PROFIL JOUEUR</p>
          <h1 className="font-barlow font-black text-3xl text-white uppercase">{player.cod_username}</h1>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-ghost-red/10 border border-ghost-red/30 text-ghost-red px-4 py-3 rounded text-xs font-barlow flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-ghost-green/10 border border-ghost-green/30 text-ghost-green px-4 py-3 rounded text-xs font-barlow">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="font-barlow font-bold text-lg text-white uppercase mb-4 border-b border-ghost-border pb-2">Informations Générales</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-ghost-gray text-xs mb-1 font-barlow uppercase">ID Supabase</label>
                <input type="text" value={player.id} disabled className="input-dark w-full text-ghost-gray/50 cursor-not-allowed font-mono text-[10px]" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-ghost-gray text-xs mb-1 font-barlow uppercase">Pseudo in-game</label>
                  <input 
                    type="text" 
                    value={codUsername} 
                    onChange={e => setCodUsername(e.target.value)} 
                    className="input-dark w-full text-white" 
                  />
                </div>
                <div>
                  <label className="block text-ghost-gray text-xs mb-1 font-barlow uppercase">Nom Réel</label>
                  <input 
                    type="text" 
                    value={realName} 
                    onChange={e => setRealName(e.target.value)} 
                    className="input-dark w-full text-white" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-ghost-gray text-xs mb-1 font-barlow uppercase">Date d'inscription</label>
                <p className="text-white text-sm font-barlow">{new Date(player.created_at).toLocaleString('fr-FR')}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-ghost-border flex justify-end">
              <button 
                onClick={saveChanges} 
                disabled={saving || (codUsername === player.cod_username && realName === player.real_name)}
                className="btn-gold px-6 py-2 flex items-center gap-2 text-xs disabled:opacity-50"
              >
                {saving ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
                SAUVEGARDER LES MODIFICATIONS
              </button>
            </div>
          </div>

          <div className="card p-6 border-ghost-red/20">
            <h2 className="font-barlow font-bold text-lg text-ghost-red uppercase mb-4 border-b border-ghost-red/20 pb-2 flex items-center gap-2">
              <Trash2 size={18} /> Zone Dangereuse
            </h2>
            <p className="text-ghost-gray text-xs mb-4">
              La suppression d'un joueur est <strong>définitive et irréversible</strong>. Cela effacera toutes ses données, le retirera de son équipe et supprimera ses accès (auth.users).
            </p>
            <button 
              onClick={deletePlayer} 
              disabled={deleting}
              className="w-full bg-ghost-red/10 border border-ghost-red text-ghost-red py-3 text-xs font-barlow font-bold uppercase tracking-widest hover:bg-ghost-red hover:text-white transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {deleting ? <Activity size={14} className="animate-spin" /> : <Trash2 size={14} />}
              SUPPRIMER DÉFINITIVEMENT LE JOUEUR
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-barlow font-bold text-lg text-white uppercase mb-4 border-b border-ghost-border pb-2">Statistiques</h2>
            {stats ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded">
                  <span className="text-ghost-gray text-xs font-barlow">Points Équipe (4v4)</span>
                  <span className="text-white font-black">{stats.team_points}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded">
                  <span className="text-ghost-gray text-xs font-barlow">Points Solo (FFA)</span>
                  <span className="text-white font-black">{stats.solo_points}</span>
                </div>
                <div className="flex justify-between items-center bg-ghost-gold/10 p-2 rounded border border-ghost-gold/20">
                  <span className="text-ghost-gold text-xs font-barlow font-bold">TOTAL</span>
                  <span className="text-ghost-gold font-black text-lg">{stats.total_points}</span>
                </div>
                <div className="mt-4 pt-2 border-t border-ghost-border">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${stats.qualified ? 'bg-ghost-green/20 text-ghost-green' : 'bg-ghost-gray/20 text-ghost-gray'}`}>
                    {stats.qualified ? 'Qualifié Phase 2' : 'Non Qualifié'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-ghost-gray text-xs italic">Aucune donnée de tournoi.</p>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-barlow font-bold text-lg text-white uppercase mb-4 border-b border-ghost-border pb-2">Historique Matchs</h2>
            {matches.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto hide-scrollbar pr-2">
                {matches.map(m => (
                  <div key={m.id} className="bg-slate-900/50 border border-slate-800 p-3 rounded cursor-pointer hover:border-ghost-gold/30 transition-colors" onClick={() => onNavigate('admin-match-detail', m.id)}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-ghost-gold uppercase tracking-wider">{m.format} - {m.round_name}</span>
                      <span className="text-[10px] text-ghost-gray">{m.status}</span>
                    </div>
                    <p className="text-xs text-white truncate">
                      {m.team1_name ?? 'TBD'} <span className="text-ghost-gray">vs</span> {m.team2_name ?? 'TBD'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-ghost-gray text-xs italic">Aucun match joué.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
