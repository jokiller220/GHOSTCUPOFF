import React, { useState } from 'react';
import { X, UserMinus, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Team, Profile } from '../types';

interface AdminTeamModalProps {
  team: Team;
  allPlayers: Profile[];
  onClose: () => void;
  onUpdate: () => void;
}

export function AdminTeamModal({ team, allPlayers, onClose, onUpdate }: AdminTeamModalProps) {
  const [teamName, setTeamName] = useState(team.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeMembers = team.members?.filter(m => m.status !== 'kicked') || [];
  const playersInTeams = new Set(activeMembers.map(m => m.profile_id));
  
  // Players that can be added (not currently in THIS team)
  const availablePlayers = allPlayers.filter(p => !playersInTeams.has(p.id));

  const [selectedPlayer, setSelectedPlayer] = useState('');

  async function handleUpdateName() {
    if (!teamName.trim()) return;
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('teams').update({ name: teamName.trim() }).eq('id', team.id);
    setSaving(false);
    if (err) setError(err.message);
    else onUpdate();
  }

  async function handleDeleteTeam() {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette équipe ? Les joueurs seront libérés.")) return;
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('teams').delete().eq('id', team.id);
    setSaving(false);
    if (err) setError(err.message);
    else {
      onUpdate();
      onClose();
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!window.confirm("Retirer ce joueur de l'équipe ?")) return;
    setSaving(true);
    setError('');
    // Rather than delete, standard logic sets status to 'kicked'
    const { error: err } = await supabase.from('team_members').update({ status: 'kicked' }).eq('id', memberId);
    setSaving(false);
    if (err) setError(err.message);
    else onUpdate();
  }

  async function handleAddMember() {
    if (!selectedPlayer) return;
    
    const maxMembers = team.format === '4v4' ? 4 : 1;
    if (activeMembers.length >= maxMembers) {
      setError(`Cette équipe est déjà complète (${maxMembers} joueurs max).`);
      return;
    }

    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('team_members').insert({
      team_id: team.id,
      profile_id: selectedPlayer,
      status: 'active'
    });
    setSaving(false);
    if (err) setError(err.message);
    else {
      setSelectedPlayer('');
      onUpdate();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-ghost-border pb-4">
          <h2 className="font-barlow font-black text-2xl text-white uppercase">GÉRER L'ÉQUIPE</h2>
          <button onClick={onClose} className="text-ghost-gray hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-ghost-red/10 border border-ghost-red/30 text-ghost-red px-4 py-3 rounded text-xs font-barlow">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* RENOMMER */}
          <div>
            <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Nom de l'équipe</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={teamName} 
                onChange={(e) => setTeamName(e.target.value)} 
                className="input-dark flex-1" 
              />
              <button 
                onClick={handleUpdateName} 
                disabled={saving || teamName === team.name}
                className="btn-outline text-xs px-4 whitespace-nowrap disabled:opacity-50"
              >
                RENOMMER
              </button>
            </div>
          </div>

          {/* MEMBRES */}
          <div>
            <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Membres ({activeMembers.length})</label>
            <div className="space-y-2 mb-4">
              {activeMembers.map(m => {
                const p = allPlayers.find(p => p.id === m.profile_id);
                return (
                  <div key={m.id} className="flex justify-between items-center bg-black/40 border border-ghost-border p-2">
                    <div>
                      <p className="text-white text-sm font-barlow">{p?.cod_username || 'Joueur inconnu'}</p>
                      {team.captain_id === p?.id && <span className="text-ghost-gold text-[9px] uppercase tracking-wider">Capitaine</span>}
                    </div>
                    {team.captain_id !== p?.id && (
                      <button 
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={saving}
                        className="text-ghost-red hover:text-red-400 p-1 disabled:opacity-50"
                        title="Retirer le joueur"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2">
              <select 
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="input-dark flex-1 text-sm"
              >
                <option value="">-- Ajouter un joueur --</option>
                {availablePlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.cod_username} ({p.real_name})</option>
                ))}
              </select>
              <button 
                onClick={handleAddMember}
                disabled={saving || !selectedPlayer}
                className="btn-gold text-xs px-4 whitespace-nowrap disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-ghost-border">
            <button 
              onClick={handleDeleteTeam}
              disabled={saving}
              className="w-full bg-ghost-red/10 border border-ghost-red/30 text-ghost-red font-barlow font-bold uppercase tracking-widest py-3 hover:bg-ghost-red hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              SUPPRIMER L'ÉQUIPE DÉFINITIVEMENT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
