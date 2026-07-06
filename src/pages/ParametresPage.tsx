import { useState, FormEvent } from 'react';
import { CheckCircle, AlertCircle, User, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Page } from '../types';

interface ParametresPageProps {
  onNavigate: (page: Page) => void;
}

export default function ParametresPage({ onNavigate }: ParametresPageProps) {
  const { profile, refreshProfile, signOut } = useAuth();
  const [codUsername, setCodUsername] = useState(profile?.cod_username ?? '');
  const [realName, setRealName] = useState(profile?.real_name ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const { error: err } = await supabase
      .from('profiles')
      .update({ cod_username: codUsername, real_name: realName })
      .eq('id', profile!.id);

    if (err) { setError(err.message); } else {
      await refreshProfile();
      setSuccess('Profil mis à jour.');
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  }

  async function handleSignOut() {
    await signOut();
    onNavigate('home');
  }

  return (
    <div className="animate-slide-up max-w-lg">
      <div className="mb-8">
        <p className="section-title">GHOST CUP</p>
        <h1 className="font-barlow font-black text-3xl text-white uppercase">PARAMÈTRES</h1>
      </div>

      {/* Profile settings */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <User size={16} className="text-ghost-gold" />
          <p className="font-barlow font-black text-white text-sm uppercase tracking-widest">Profil</p>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Pseudo COD</label>
            <input
              value={codUsername}
              onChange={e => setCodUsername(e.target.value)}
              className="input-dark"
              required
            />
          </div>
          <div>
            <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Prénom</label>
            <input
              value={realName}
              onChange={e => setRealName(e.target.value)}
              className="input-dark"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-ghost-red/10 border border-ghost-red/30 px-3 py-2">
              <AlertCircle size={12} className="text-ghost-red shrink-0" />
              <span className="text-ghost-red text-xs">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-ghost-green/10 border border-ghost-green/30 px-3 py-2">
              <CheckCircle size={12} className="text-ghost-green shrink-0" />
              <span className="text-ghost-green text-xs">{success}</span>
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-gold text-xs py-2.5 disabled:opacity-50">
            {saving ? 'SAUVEGARDE...' : 'ENREGISTRER'}
          </button>
        </form>
      </div>

      {/* Security */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={16} className="text-ghost-gold" />
          <p className="font-barlow font-black text-white text-sm uppercase tracking-widest">Sécurité</p>
        </div>
        <p className="text-ghost-gray text-xs mb-4">Pour changer votre mot de passe, reconnectez-vous et utilisez l'option "Mot de passe oublié".</p>
      </div>

      {/* Danger zone */}
      <div className="card p-6 border-ghost-red/20">
        <p className="font-barlow font-black text-ghost-red text-sm uppercase tracking-widest mb-4">Zone danger</p>
        <button
          onClick={handleSignOut}
          className="btn-red text-xs py-2.5"
        >
          SE DÉCONNECTER
        </button>
      </div>
    </div>
  );
}
