import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Page, Profile } from '../types';
import { AlertTriangle, CheckCircle, Eye, User, Trophy } from 'lucide-react';

interface AdminLobbyPageProps {
  onNavigate: (page: Page, data?: unknown) => void;
}

interface FFAScoreProof {
  id: string;
  lobby_name: string;
  submitted_by: string;
  rank: number;
  file_url: string;
  status: string;
  created_at: string;
  profiles: {
    cod_username: string;
    avatar_url: string;
  };
}

interface FFADispute {
  id: string;
  lobby_name: string;
  status: string;
  created_at: string;
}

export default function AdminLobbyPage({ onNavigate }: AdminLobbyPageProps) {
  const [disputes, setDisputes] = useState<FFADispute[]>([]);
  const [proofs, setProofs] = useState<Record<string, FFAScoreProof[]>>({});
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    loadDisputes();
  }, []);

  async function loadDisputes() {
    setLoading(true);
    // Fetch open disputes
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
    setLoading(false);
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

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black font-barlow text-white uppercase tracking-wider mb-2">Litiges Lobbys (FFA)</h1>
          <p className="text-ghost-gray text-sm max-w-2xl">
            Gérez les conflits de position lors de la phase 1 (FFA). Si deux joueurs réclament le même rang dans un même lobby, vous devez examiner leurs preuves.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20 text-ghost-gray">Chargement...</div>
      ) : disputes.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-white font-barlow uppercase mb-2">Aucun litige de lobby</h2>
          <p className="text-ghost-gray">Tous les lobbys sont conformes ou en attente de preuves.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {disputes.map(dispute => (
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
          ))}
        </div>
      )}
    </div>
  );
}
