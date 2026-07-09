import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, CheckCircle, User, Eye, Clock, Edit2, Calendar, Target, RefreshCw } from 'lucide-react';
import { Page, FFADispute, FFAScoreProof } from '../types';

interface AdminLobbyPageProps {
  onNavigate: (page: Page, data?: unknown) => void;
}

export default function AdminLobbyPage({ onNavigate }: AdminLobbyPageProps) {
  const [activeTab, setActiveTab] = useState<'planning' | 'litiges'>('planning');
  
  // Litiges state
  const [disputes, setDisputes] = useState<FFADispute[]>([]);
  const [proofs, setProofs] = useState<Record<string, FFAScoreProof[]>>({});
  const [resolving, setResolving] = useState<string | null>(null);
  
  // Planning state
  const [ffaConfig, setFfaConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadDisputes(), loadPlanning()]);
    setLoading(false);
  }

  async function loadPlanning() {
    const { data } = await supabase.from('schedule_config').select('*').eq('type', 'ffa').single();
    if (data) {
      setFfaConfig(data.config);
    }
  }

  async function loadDisputes() {
    const { data: disputesData } = await supabase
      .from('ffa_disputes')
      .select('*')
      .eq('status', 'open');

    const loadedDisputes = disputesData || [];
    setDisputes(loadedDisputes);

    // Fetch proofs for these lobbies
    if (loadedDisputes.length > 0) {
      const lobbyNames = loadedDisputes.map(d => d.lobby_name);
      const { data: proofsData } = await supabase
        .from('ffa_score_proofs')
        .select('*, profiles(cod_username, avatar_url)')
        .in('lobby_name', lobbyNames)
        .order('rank', { ascending: true });

      const proofsMap: Record<string, FFAScoreProof[]> = {};
      if (proofsData) {
        proofsData.forEach((p: any) => {
          if (!proofsMap[p.lobby_name]) proofsMap[p.lobby_name] = [];
          proofsMap[p.lobby_name].push(p);
        });
      }
      setProofs(proofsMap);
    }
  }

  async function resolveDispute(lobbyName: string) {
    if (!window.confirm("Avez-vous corrigé les rangs ? Cette action validera le lobby et attribuera les points selon le barème.")) return;
    
    setResolving(lobbyName);
    
    // First, verify there are no duplicate ranks remaining
    const lobbyProofs = proofs[lobbyName] || [];
    const ranks = lobbyProofs.map(p => p.rank);
    const uniqueRanks = new Set(ranks);
    if (ranks.length !== uniqueRanks.size) {
      alert("Erreur : Il y a encore des doublons de rang dans ce lobby ! Veuillez corriger les rangs avant de valider.");
      setResolving(null);
      return;
    }

    try {
      // Approve all pending proofs
      await supabase.from('ffa_score_proofs').update({ status: 'approved' }).eq('lobby_name', lobbyName).eq('status', 'pending');
      
      // Close the dispute
      await supabase.from('ffa_disputes').update({ status: 'resolved' }).eq('lobby_name', lobbyName);
      
      // Update points for each player
      for (const p of lobbyProofs) {
        let points = 0;
        if (p.rank === 1) points = 5;
        else if (p.rank === 2) points = 3;
        else if (p.rank === 3) points = 2;
        else if (p.rank === 4) points = 1;
        
        if (points > 0) {
          const { data: te } = await supabase.from('tournament_entries').select('solo_points').eq('profile_id', p.submitted_by).single();
          if (te) {
            await supabase.from('tournament_entries').update({
              solo_points: (te.solo_points || 0) + points
            }).eq('profile_id', p.submitted_by);
          }
        }
      }
      
      alert("Lobby validé avec succès ! Les points ont été attribués.");
      
      // Mark lobby as completed in schedule config
      if (ffaConfig && ffaConfig.lobbies) {
        const updatedConfig = { ...ffaConfig };
        let modified = false;
        updatedConfig.lobbies.forEach((r: any) => {
          r.lobbies.forEach((l: any) => {
            if (l.name === lobbyName) {
              l.status = 'completed';
              modified = true;
            }
          });
        });
        if (modified) {
          await supabase.from('schedule_config').upsert({ type: 'ffa', config: updatedConfig });
          setFfaConfig(updatedConfig);
        }
      }

      loadDisputes();
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la résolution.");
    }
    
    setResolving(null);
  }
  
  async function updateRank(proofId: string, lobbyName: string, newRank: number) {
    await supabase.from('ffa_score_proofs').update({ rank: newRank }).eq('id', proofId);
    
    // Update local state
    setProofs(prev => {
      const updated = { ...prev };
      if (updated[lobbyName]) {
        updated[lobbyName] = updated[lobbyName].map(p => p.id === proofId ? { ...p, rank: newRank } : p);
        updated[lobbyName].sort((a, b) => a.rank - b.rank);
      }
      return updated;
    });
  }

  async function savePlanning(newConfig: any) {
    setSaving(true);
    const { error } = await supabase.from('schedule_config').upsert({ type: 'ffa', config: newConfig });
    if (!error) {
      setFfaConfig(newConfig);
      alert("Planning enregistré avec succès !");
    } else {
      alert("Erreur lors de l'enregistrement.");
    }
    setSaving(false);
  }

  function handleLobbyChange(roundIndex: number, lobbyIndex: number, field: string, value: string) {
    if (!ffaConfig) return;
    const newConfig = { ...ffaConfig };
    newConfig.lobbies[roundIndex].lobbies[lobbyIndex][field] = value;
    setFfaConfig(newConfig);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-2xl font-black font-barlow text-white uppercase tracking-wider mb-2">Gestion des Lobbys (FFA)</h1>
          <p className="text-ghost-gray text-sm max-w-2xl">
            Gérez le statut, les dates individuelles et résolvez les litiges de chaque lobby FFA.
          </p>
        </div>
      </div>

      <div className="flex border-b border-ghost-border mb-8 gap-0">
        <button
          onClick={() => setActiveTab('planning')}
          className={`px-6 py-3 font-barlow font-black text-xs uppercase tracking-widest border-b-2 transition-all duration-200 ${
            activeTab === 'planning'
              ? 'text-ghost-gold border-ghost-gold'
              : 'text-ghost-gray border-transparent hover:text-white'
          }`}
        >
          PLANNING & STATUTS
        </button>
        <button
          onClick={() => setActiveTab('litiges')}
          className={`px-6 py-3 font-barlow font-black text-xs uppercase tracking-widest border-b-2 transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'litiges'
              ? 'text-red-500 border-red-500'
              : 'text-ghost-gray border-transparent hover:text-white'
          }`}
        >
          LITIGES {disputes.length > 0 && <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-[10px]">{disputes.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-20 text-ghost-gray">Chargement...</div>
      ) : activeTab === 'planning' ? (
        <div className="space-y-6">
          {!ffaConfig || !ffaConfig.lobbies || ffaConfig.lobbies.length === 0 ? (
            <div className="card p-12 text-center text-ghost-gray">
              <p>Aucun lobby FFA n'a été généré. Allez dans "Générateur FFA" pour créer les lobbys.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => savePlanning(ffaConfig)}
                  disabled={saving}
                  className="btn-gold flex items-center gap-2"
                >
                  {saving ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                  ENREGISTRER LE PLANNING
                </button>
              </div>

              {ffaConfig.lobbies.map((round: any, roundIndex: number) => (
                <div key={`round-${round.round}`} className="card p-6 border-ghost-border/50 mb-6">
                  <h2 className="font-barlow font-black text-ghost-gold uppercase text-lg tracking-[0.2em] mb-4">
                    Partie {round.round}
                  </h2>
                  <div className="space-y-4">
                    {round.lobbies.map((lobby: any, lobbyIndex: number) => {
                      const dateObj = lobby.scheduled_at ? new Date(lobby.scheduled_at) : null;
                      const dateStr = dateObj ? dateObj.toISOString().split('T')[0] : '';
                      const timeStr = dateObj ? dateObj.toTimeString().substring(0, 5) : '';

                      return (
                        <div key={lobby.name} className="bg-black/30 rounded-lg border border-ghost-border p-4 flex flex-col md:flex-row gap-6 md:items-center">
                          
                          <div className="w-48 shrink-0">
                            <h3 className="font-barlow font-bold text-white uppercase">{lobby.name}</h3>
                            <p className="text-xs text-ghost-gray mt-1">{lobby.players?.length || 0} joueurs</p>
                          </div>

                          <div className="flex-1 flex flex-wrap gap-4 items-end">
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] text-ghost-gray font-bold uppercase tracking-widest flex items-center gap-1">
                                <Calendar size={12} /> Date
                              </label>
                              <input 
                                type="date" 
                                value={dateStr}
                                onChange={(e) => {
                                  let newScheduledAt = null;
                                  if (e.target.value) {
                                    newScheduledAt = `${e.target.value}T${timeStr || '00:00'}:00Z`;
                                  }
                                  handleLobbyChange(roundIndex, lobbyIndex, 'scheduled_at', newScheduledAt || '');
                                }}
                                className="input-dark text-sm w-36"
                              />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] text-ghost-gray font-bold uppercase tracking-widest flex items-center gap-1">
                                <Clock size={12} /> Heure (UTC)
                              </label>
                              <input 
                                type="time" 
                                value={timeStr}
                                onChange={(e) => {
                                  let newScheduledAt = null;
                                  if (e.target.value) {
                                    const d = dateStr || new Date().toISOString().split('T')[0];
                                    newScheduledAt = `${d}T${e.target.value}:00Z`;
                                  }
                                  handleLobbyChange(roundIndex, lobbyIndex, 'scheduled_at', newScheduledAt || '');
                                }}
                                className="input-dark text-sm w-28"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] text-ghost-gray font-bold uppercase tracking-widest flex items-center gap-1">
                                <Target size={12} /> Statut
                              </label>
                              <select
                                value={lobby.status || 'scheduled'}
                                onChange={(e) => handleLobbyChange(roundIndex, lobbyIndex, 'status', e.target.value)}
                                className="input-dark text-sm"
                              >
                                <option value="scheduled">À venir</option>
                                <option value="live">En cours</option>
                                <option value="completed">Terminé</option>
                                <option value="postponed">Reporté</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {disputes.length === 0 ? (
            <div className="card p-12 text-center">
              <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
              <h2 className="text-xl font-bold text-white font-barlow uppercase mb-2">Aucun litige de lobby</h2>
              <p className="text-ghost-gray">Tous les lobbys sont conformes ou en attente de preuves.</p>
            </div>
          ) : (
            disputes.map(dispute => (
              <div key={dispute.id} className="card p-6 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-ghost-border">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-red-500" size={24} />
                    <h2 className="text-lg font-bold text-white font-barlow uppercase">{dispute.lobby_name}</h2>
                  </div>
                  <button
                    onClick={() => resolveDispute(dispute.lobby_name)}
                    disabled={resolving === dispute.lobby_name}
                    className="btn-gold py-2 px-6 text-sm"
                  >
                    {resolving === dispute.lobby_name ? 'Validation...' : 'Valider le Lobby'}
                  </button>
                </div>

                <div className="space-y-4">
                  {proofs[dispute.lobby_name]?.map(proof => (
                    <div key={proof.id} className="bg-ghost-dark/50 p-4 rounded-lg border border-ghost-border/50 flex flex-col md:flex-row items-center gap-6">
                      
                      <div className="flex items-center gap-3 w-48 shrink-0">
                        {proof.profiles?.avatar_url ? (
                          <img src={proof.profiles.avatar_url} className="w-10 h-10 rounded-full object-cover border border-ghost-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-ghost-dark border border-ghost-border flex items-center justify-center">
                            <User size={16} className="text-ghost-gray" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-bold text-white">{proof.profiles?.cod_username}</div>
                          <div className="text-xs text-ghost-gray">{new Date(proof.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 shrink-0">
                        <label className="text-[10px] text-ghost-gray font-bold uppercase tracking-widest">Rang Revendiqué</label>
                        <input 
                          type="number" 
                          value={proof.rank}
                          onChange={(e) => updateRank(proof.id, dispute.lobby_name, parseInt(e.target.value))}
                          className="input-ghost w-20 text-center font-bold text-lg"
                          min="1"
                          max="30"
                        />
                      </div>
                      
                      <div className="flex-1 flex justify-end">
                        {proof.file_url ? (
                          <a 
                            href={proof.file_url.split(',')[0]} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-ghost-gold hover:text-white transition-colors bg-ghost-gold/10 px-4 py-2 rounded-lg"
                          >
                            <Eye size={16} />
                            <span className="text-sm font-bold font-barlow tracking-wider">VOIR LA PREUVE</span>
                          </a>
                        ) : (
                          <span className="text-ghost-gray text-sm italic">Aucune image</span>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
