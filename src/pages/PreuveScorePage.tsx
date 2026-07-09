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
  const [rounds, setRounds] = useState<{t1: string, t2: string}[]>([
    { t1: '', t2: '' },
    { t1: '', t2: '' },
    { t1: '', t2: '' },
    { t1: '', t2: '' },
    { t1: '', t2: '' }
  ]);
  const [files, setFiles] = useState<File[]>([]);
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

  function handleFileChange(newFiles: FileList | File[] | null) {
    if (!newFiles || newFiles.length === 0) return;
    const MAX_MB = 20;
    const validFiles: File[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`Le fichier ${f.name} est trop volumineux. Maximum ${MAX_MB}MB.`);
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(f.type)) {
        setError(`Le format du fichier ${f.name} est invalide. Acceptés : JPG, PNG, GIF.`);
        return;
      }
      validFiles.push(f);
    }
    setError('');
    setFiles(prev => [...prev, ...validFiles]);
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (files.length === 0) { setError('Veuillez sélectionner au moins un fichier.'); return; }
    if (!profile) { setError('Vous devez être connecté.'); return; }
    
    const validRounds = rounds.filter(r => r.t1 !== '' && r.t2 !== '');
    if (validRounds.length === 0) { setError('Veuillez renseigner le score d\'au moins une manche.'); return; }

    let finalT1 = 0;
    let finalT2 = 0;
    validRounds.forEach(r => {
      const s1 = parseInt(r.t1);
      const s2 = parseInt(r.t2);
      if (s1 > s2) finalT1++;
      else if (s2 > s1) finalT2++;
    });

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
    const uploadedUrls: string[] = [];
    for (const f of files) {
      const ext = f.name.split('.').pop();
      const path = `proofs/${matchId}/${profile.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('score-proofs')
        .upload(path, f, { upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('score-proofs').getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      } else {
        uploadedUrls.push(`local:${f.name}`);
      }
    }

    const proofUrlsString = uploadedUrls.join(',');
    const roundDetails = validRounds.map((r, i) => `M${i+1}: ${r.t1}-${r.t2}`).join(', ');
    const fullComment = `[Score: ${finalT1} - ${finalT2}] (${roundDetails}) ${comment ? '- ' + comment : ''}`;

    let rpcError = null;
    try {
      const { error } = await supabase.rpc('handle_proof_submission', {
        p_match_id: matchId,
        p_submitted_by: profile.id,
        p_file_url: proofUrlsString,
        p_comment: fullComment,
        p_team1_score: finalT1,
        p_team2_score: finalT2,
        p_team_side: teamSide
      });
      rpcError = error;
    } catch (e: any) {
      rpcError = e;
    }

    if (rpcError) {
      // Fallback si la fonction RPC n'est pas trouvée (base de données non migrée)
      const { error: insertError } = await supabase.from('score_proofs').insert({
        match_id: matchId,
        submitted_by: profile.id,
        file_url: proofUrlsString,
        comment: fullComment,
        status: 'pending'
      });
      if (insertError) {
        setError(insertError.message || rpcError.message);
        setUploading(false);
        return;
      }
    }

    await supabase.from('activity_logs').insert({
      action: 'proof_submitted',
      details: {
        match_id: matchId,
        submitted_by: profile.id,
        file_url: proofUrlsString,
        comment: fullComment,
        team1_score: finalT1,
        team2_score: finalT2
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
          <p className="section-title mb-6">DÉTAIL DES MANCHES</p>
          <div className="flex justify-between font-barlow font-bold text-white text-sm mb-4 px-4">
            <span className="w-1/3 text-left">{match?.team1_name ?? 'Équipe 1'}</span>
            <span className="w-1/3 text-center text-ghost-gray">MANCHES</span>
            <span className="w-1/3 text-right">{match?.team2_name ?? 'Équipe 2'}</span>
          </div>
          
          <div className="space-y-3">
            {rounds.map((round, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-ghost-dark/50 p-3 rounded-lg border border-ghost-border/50">
                <input 
                  type="number" 
                  min="0" 
                  className="input-dark w-full text-center text-lg font-black py-2"
                  placeholder="0"
                  value={round.t1}
                  onChange={e => {
                    const newRounds = [...rounds];
                    newRounds[idx].t1 = e.target.value;
                    setRounds(newRounds);
                  }}
                />
                <span className="font-barlow font-bold text-ghost-gray whitespace-nowrap px-2">
                  #{idx + 1}
                </span>
                <input 
                  type="number" 
                  min="0" 
                  className="input-dark w-full text-center text-lg font-black py-2"
                  placeholder="0"
                  value={round.t2}
                  onChange={e => {
                    const newRounds = [...rounds];
                    newRounds[idx].t2 = e.target.value;
                    setRounds(newRounds);
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-center text-ghost-gray text-xs mt-4">
            Laissez vides les manches non jouées. Le score final (ex: 3-0) sera calculé automatiquement.
          </p>
        </div>

        <div className="card p-8 mb-6">
          <p className="section-title mb-4">UPLOAD DE LA PREUVE</p>
          <div
            className={`border-2 border-dashed p-10 text-center transition-all duration-200 ${
              dragOver
                ? 'border-ghost-gold bg-ghost-gold/5'
                : 'border-ghost-border hover:border-ghost-gold/50 cursor-pointer'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              handleFileChange(e.dataTransfer.files);
            }}
          >
            <div className="flex flex-col items-center gap-3 pointer-events-none">
              <Upload size={40} className="text-ghost-gray/40" strokeWidth={1} />
              <p className="font-barlow text-ghost-gray text-sm">Glissez vos fichiers ici ou</p>
              <button type="button" className="btn-outline text-xs py-2 px-5 pointer-events-auto" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>CHOISIR DES FICHIERS</button>
              <p className="text-ghost-gray/50 text-[10px]">Formats acceptés : JPG, PNG, GIF (Max 20MB par fichier)</p>
            </div>
          </div>
          
          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              {files.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between bg-ghost-dark border border-ghost-border p-3 rounded-md">
                  <div className="flex items-center gap-3">
                    <FileImage size={24} className="text-ghost-green" strokeWidth={1} />
                    <div>
                      <p className="font-barlow font-bold text-white text-xs">{f.name}</p>
                      <p className="text-ghost-gray text-[10px]">{(f.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeFile(idx)}
                    className="text-ghost-red hover:text-white transition-colors text-xs font-barlow uppercase"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif"
            className="hidden"
            onChange={e => handleFileChange(e.target.files)}
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
