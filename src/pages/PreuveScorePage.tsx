import { useState, useRef, FormEvent, useEffect } from 'react';
import { ChevronLeft, Upload, CheckCircle, AlertCircle, FileImage, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Page, Match, Profile } from '../types';

interface PreuveScorePageProps {
  matchId: string;
  onNavigate: (page: Page, data?: unknown) => void;
}

export default function PreuveScorePage({ matchId, onNavigate }: PreuveScorePageProps) {
  const { profile } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [team1Score, setTeam1Score] = useState<string>('');
  const [team2Score, setTeam2Score] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMatch();
    // Also trigger auto validation of old proofs
    supabase.rpc('auto_validate_old_proofs').then(() => {});
  }, [matchId]);

  async function loadMatch() {
    setLoading(true);
    const { data } = await supabase.from('matches').select('*').eq('id', matchId).maybeSingle();
    setMatch((data as Match) ?? null);
    setLoading(false);
  }

  function handleFileChange(f: File | null) {
    if (!f) return;
    const MAX_MB = 20;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux. Maximum ${MAX_MB}MB.`);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(f.type)) {
      setError('Format invalide. Acceptés : JPG, PNG, GIF.');
      return;
    }
    setError('');
    setFile(f);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) { setError('Veuillez sélectionner un fichier.'); return; }
    if (!profile) { setError('Vous devez être connecté.'); return; }
    if (team1Score === '' || team2Score === '') { setError('Veuillez renseigner les deux scores.'); return; }

    setUploading(true);
    setError('');

    // Determine side
    let teamSide = 'team1'; // default
    if (match?.format === '4v4') {
      const { data: tm } = await supabase.from('team_members').select('team_id').eq('profile_id', profile.id).eq('status', 'active');
      if (tm && tm.length > 0 && tm.some(m => m.team_id === match.team2_id)) {
        teamSide = 'team2';
      }
    } else {
      if (match?.team2_id === profile.id) { // In 1v1, team_id stores profile_id
        teamSide = 'team2';
      }
    }

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop();
    const path = `proofs/${matchId}/${profile.id}_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('score-proofs')
      .upload(path, file, { upsert: true });

    let proofUrl = `local:${file.name}`;
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('score-proofs').getPublicUrl(path);
      proofUrl = publicUrl;
    }

    const { error: rpcError } = await supabase.rpc('handle_proof_submission', {
      p_match_id: matchId,
      p_submitted_by: profile.id,
      p_file_url: proofUrl,
      p_comment: comment || null,
      p_team1_score: parseInt(team1Score),
      p_team2_score: parseInt(team2Score),
      p_team_side: teamSide
    });

    if (rpcError) {
      setError(rpcError.message);
      setUploading(false);
      return;
    }

    await supabase.from('activity_logs').insert({
      action: 'proof_submitted',
      details: {
        match_id: matchId,
        submitted_by: profile.id,
        file_url: proofUrl,
        comment: comment || null,
        team1_score: parseInt(team1Score),
        team2_score: parseInt(team2Score)
      },
    });

    setUploading(false);
    setSuccess('Preuve envoyée pour validation.');
    setTimeout(() => onNavigate('match-detail', matchId), 2500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-ghost-gray gap-2">
        <RefreshCw className="animate-spin" size={16} /> Chargement...
      </div>
    );
  }

  return (
    <div className="animate-slide-up px-6 py-10 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => onNavigate('match-detail', matchId)}
        className="flex items-center gap-2 text-ghost-gray hover:text-white transition-colors mb-6 font-barlow text-xs uppercase tracking-wider"
      >
        <ChevronLeft size={14} /> RETOUR AU MATCH
      </button>

      <div className="text-center mb-10">
        <p className="section-title text-center">GHOST CUP</p>
        <h1 className="font-barlow font-black text-3xl text-white uppercase">PREUVE DE SCORE</h1>
        <div className="gold-divider" />
        <p className="text-ghost-gray text-sm mt-4 max-w-sm mx-auto">
          Saisissez le score du match et uploadez une capture d'écran de fin de partie. Le match sera validé si les deux équipes soumettent le même score, ou si l'équipe adverse ne répond pas sous 30 minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card p-8 mb-6">
          <p className="section-title mb-6">RÉSULTAT DU MATCH</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <label className="block font-barlow font-bold text-white text-sm mb-2">{match?.team1_name ?? 'Équipe 1'}</label>
              <input 
                type="number" 
                min="0" 
                max="5"
                className="input-dark w-full text-center text-xl font-black py-4"
                placeholder="0"
                value={team1Score}
                onChange={e => setTeam1Score(e.target.value)}
              />
            </div>
            <div className="text-center">
              <label className="block font-barlow font-bold text-white text-sm mb-2">{match?.team2_name ?? 'Équipe 2'}</label>
              <input 
                type="number" 
                min="0" 
                max="5"
                className="input-dark w-full text-center text-xl font-black py-4"
                placeholder="0"
                value={team2Score}
                onChange={e => setTeam2Score(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card p-8 mb-6">
          <p className="section-title mb-4">UPLOAD DE LA PREUVE</p>
          <div
            className={`border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-ghost-gold bg-ghost-gold/5'
                : file
                ? 'border-ghost-green bg-ghost-green/5'
                : 'border-ghost-border hover:border-ghost-gold/50'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              handleFileChange(e.dataTransfer.files[0] ?? null);
            }}
          >
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <FileImage size={40} className="text-ghost-green" strokeWidth={1} />
                <p className="font-barlow font-bold text-ghost-green text-sm">{file.name}</p>
                <p className="text-ghost-gray text-xs">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload size={40} className="text-ghost-gray/40" strokeWidth={1} />
                <p className="font-barlow text-ghost-gray text-sm">Glissez votre fichier ici ou</p>
                <button type="button" className="btn-outline text-xs py-2 px-5">CHOISIR UN FICHIER</button>
                <p className="text-ghost-gray/50 text-[10px]">Formats acceptés : JPG, PNG, GIF (Max 20MB)</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            className="hidden"
            onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="card p-6 mb-6">
          <p className="section-title mb-4">COMMENTAIRE (optionnel)</p>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Ajoutez un commentaire, précisez en cas de problème..."
            rows={4}
            className="input-dark resize-none w-full"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-ghost-red/10 border border-ghost-red/30 px-4 py-3 mb-4 rounded-xl">
            <AlertCircle size={14} className="text-ghost-red shrink-0" />
            <span className="text-ghost-red text-xs">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-ghost-green/10 border border-ghost-green/30 px-4 py-3 mb-4 rounded-xl">
            <CheckCircle size={14} className="text-ghost-green shrink-0" />
            <span className="text-ghost-green text-xs">{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !!success}
          className="btn-gold w-full py-3 justify-center flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
          {uploading ? 'ENVOI EN COURS...' : 'SOUMETTRE LE RÉSULTAT'}
        </button>
      </form>
    </div>
  );
}
