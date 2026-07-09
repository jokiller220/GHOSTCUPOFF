import { useState, useRef, FormEvent, useEffect } from 'react';
import { ChevronLeft, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Page } from '../types';

interface PreuveLobbyPageProps {
  onNavigate: (page: Page, data?: unknown) => void;
}

export default function PreuveLobbyPage({ onNavigate }: PreuveLobbyPageProps) {
  const { profile } = useAuth();
  const [lobbies, setLobbies] = useState<{name: string, playerCount: number}[]>([]);
  const [selectedLobby, setSelectedLobby] = useState('');
  const [rank, setRank] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      // Load lobbies from config
      const { data } = await supabase.from('schedule_config').select('config').eq('type', 'ffa').single();
      if (data?.config?.lobbies) {
        const userLobbies: {name: string, playerCount: number}[] = [];
        // Structure is an array of SoloLobbyRound
        data.config.lobbies.forEach((round: any) => {
          round.lobbies.forEach((lobby: any) => {
            if (lobby.players.some((p: any) => p.id === profile.id)) {
              userLobbies.push({ name: lobby.name, playerCount: lobby.players.length });
            }
          });
        });
        setLobbies(userLobbies);
        if (userLobbies.length > 0) {
          setSelectedLobby(userLobbies[0].name);
        }
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  function handleFileChange(newFiles: FileList | File[] | null) {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    setFiles(prev => [...prev, ...arr].slice(0, 3));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!selectedLobby) { setError('Veuillez sélectionner un lobby.'); return; }
    if (!rank || isNaN(parseInt(rank))) { setError('Veuillez saisir votre rang final (nombre).'); return; }
    if (files.length === 0) { setError('Veuillez joindre au moins une preuve.'); return; }

    setUploading(true);
    setError('');

    const uploadedUrls: string[] = [];
    for (const f of files) {
      const ext = f.name.split('.').pop();
      const path = `ffa_proofs/${profile.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('score-proofs')
        .upload(path, f, { upsert: true });

      if (!uploadError) {
        const { data: publicData } = supabase.storage.from('score-proofs').getPublicUrl(path);
        uploadedUrls.push(publicData.publicUrl);
      } else {
        console.error("Upload error", uploadError);
      }
    }

    if (uploadedUrls.length === 0) {
      setError("Erreur lors de l'envoi de l'image.");
      setUploading(false);
      return;
    }

    const fileUrl = uploadedUrls.join(',');
    
    const lobbyObj = lobbies.find(l => l.name === selectedLobby);
    const playerCount = lobbyObj ? lobbyObj.playerCount : 0;
    
    const { error: rpcError } = await supabase.rpc('handle_ffa_proof_submission', {
      p_lobby_name: selectedLobby,
      p_submitted_by: profile.id,
      p_rank: parseInt(rank),
      p_file_url: fileUrl,
      p_player_count: playerCount
    });

    if (rpcError) {
      // Fallback
      await supabase.from('ffa_score_proofs').insert({
        lobby_name: selectedLobby,
        submitted_by: profile.id,
        rank: parseInt(rank),
        file_url: fileUrl,
        status: 'pending'
      });
    }

    setSuccess('Votre rang a été soumis avec succès.');
    setUploading(false);
    setTimeout(() => onNavigate('dashboard'), 2000);
  }

  if (loading) {
    return <div className="flex justify-center p-20 text-ghost-gray">Chargement...</div>;
  }

  return (
    <div className="animate-slide-up px-6 py-10 max-w-2xl mx-auto">
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-2 text-ghost-gray hover:text-white transition-colors mb-6 font-barlow text-xs uppercase tracking-wider"
      >
        <ChevronLeft size={14} /> RETOUR
      </button>

      <div className="text-center mb-10">
        <p className="section-title text-center">GHOST CUP - PHASE 1</p>
        <h1 className="font-barlow font-black text-3xl text-white uppercase">PREUVE DE RANG (FFA)</h1>
        <div className="gold-divider" />
        <p className="text-ghost-gray text-sm mt-4 max-w-sm mx-auto">
          Sélectionnez votre lobby et soumettez votre rang final accompagné d'une capture d'écran.
        </p>
      </div>

      {lobbies.length === 0 ? (
        <div className="card p-6 text-center text-ghost-gray">
          Vous n'êtes actuellement assigné à aucun lobby actif.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card p-8 mb-6">
          <div className="space-y-6">
            <div>
              <label className="block text-ghost-gray text-xs uppercase font-barlow tracking-widest mb-2">Lobby</label>
              <select 
                value={selectedLobby}
                onChange={e => setSelectedLobby(e.target.value)}
                className="input-ghost w-full bg-ghost-dark/50"
              >
                {lobbies.map(l => (
                  <option key={l.name} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-ghost-gray text-xs uppercase font-barlow tracking-widest mb-2">Votre Rang Final (1 à 30)</label>
              <input 
                type="number" 
                min="1" 
                max="30"
                value={rank}
                onChange={e => setRank(e.target.value)}
                className="input-ghost w-full text-center font-bold text-xl"
                placeholder="Ex: 1"
              />
            </div>

            <div 
              className="border-2 border-dashed border-ghost-border/30 rounded-lg p-8 text-center bg-ghost-dark/30 hover:bg-ghost-dark/50 hover:border-ghost-gold/30 transition-all cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <input 
                type="file"
                className="hidden"
                ref={fileRef}
                multiple
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files)}
              />
              <Upload className="mx-auto mb-3 text-ghost-gold" size={24} />
              <p className="text-sm font-bold text-white font-barlow tracking-wider mb-1">CLIQUEZ POUR AJOUTER UNE PREUVE</p>
            </div>

            {files.length > 0 && (
              <div className="bg-ghost-dark/50 p-3 rounded-lg border border-ghost-border/30 text-sm">
                <span className="text-white font-semibold">{files.length}</span> fichier(s) sélectionné(s)
              </div>
            )}
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center gap-3">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-500/90 leading-relaxed">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg flex items-center gap-3">
                <CheckCircle size={16} className="text-green-500 shrink-0" />
                <p className="text-xs text-green-500/90 leading-relaxed">{success}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={uploading}
              className="btn-gold w-full text-sm py-4 mt-6"
            >
              {uploading ? 'ENVOI EN COURS...' : 'SOUMETTRE MON RANG'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
