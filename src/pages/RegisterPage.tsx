import { useState, FormEvent } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle, Crosshair } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Page } from '../types';

interface RegisterPageProps {
  onNavigate: (page: Page) => void;
}

export default function RegisterPage({ onNavigate }: RegisterPageProps) {
  const [regCod, setRegCod] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regAccepted, setRegAccepted] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  const { signUp } = useAuth();

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    if (regPassword !== regConfirm) { setRegError('Les mots de passe ne correspondent pas.'); return; }
    if (!regAccepted) { setRegError('Vous devez accepter le règlement du tournoi.'); return; }
    if (regPassword.length < 6) { setRegError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setRegLoading(true);
    
    // Fetch dynamic max_players limit
    const { data: settings } = await supabase.from('tournament_settings').select('max_players').single();
    const limit = settings?.max_players ?? 28;

    // Check limit
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'player');
    if (count !== null && count >= limit) {
      setRegError(`Le tournoi est complet (${limit}/${limit} joueurs). Inscription impossible.`);
      setRegLoading(false);
      return;
    }
    
    const { error } = await signUp(regEmail, regPassword, regCod, regName);
    setRegLoading(false);
    if (error) { setRegError(error); return; }
    setRegSuccess('Inscription réussie ! Redirection...');
    setTimeout(() => onNavigate('dashboard'), 1500);
  }

  return (
    <div className="min-h-screen bg-ghost-black flex flex-col relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("/bacgroungimg.jpg")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.8) contrast(120%)',
        }}
      />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="bg-ghost-dark/80 backdrop-blur border-b border-ghost-border h-14 flex items-center px-6">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2 group">
          <Crosshair size={20} className="text-ghost-gold" strokeWidth={1.5} />
          <span className="font-barlow font-black text-white text-base uppercase tracking-widest">
            GHOST <span className="text-ghost-gold">CUP</span>
          </span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-ghost-card p-8 md:p-10 border border-ghost-border">
            <div className="mb-8">
              <h2 className="font-barlow font-black text-2xl text-ghost-gold uppercase tracking-wide mb-1">INSCRIPTION</h2>
              <div className="w-10 h-0.5 bg-ghost-gold" />
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Pseudo COD</label>
                <input type="text" value={regCod} onChange={e => setRegCod(e.target.value)} placeholder="Votre pseudo Call of Duty" className="input-dark" required />
              </div>

              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Prénom</label>
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Votre prénom réel" className="input-dark" required />
              </div>

              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Email</label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="votre@email.com (optionnel)" className="input-dark" />
              </div>

              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Mot de passe</label>
                <div className="relative">
                  <input type={showRegPassword ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Créez votre mot de passe" className="input-dark pr-10" required />
                  <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ghost-gray hover:text-white transition-colors">{showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                </div>
              </div>

              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Confirmer le mot de passe</label>
                <input type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="Confirmez votre mot de passe" className="input-dark" required />
              </div>

              <div className="flex items-start gap-2">
                <input type="checkbox" id="accept" checked={regAccepted} onChange={e => setRegAccepted(e.target.checked)} className="w-3.5 h-3.5 accent-ghost-gold mt-0.5 shrink-0" />
                <label htmlFor="accept" className="text-ghost-gray text-xs font-barlow leading-relaxed">J'accepte le <span className="text-ghost-gold cursor-pointer hover:underline">règlement du tournoi</span></label>
              </div>

              {regError && (
                <div className="flex items-center gap-2 bg-ghost-red/10 border border-ghost-red/30 px-3 py-2">
                  <AlertCircle size={14} className="text-ghost-red shrink-0" />
                  <span className="text-ghost-red text-xs">{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="flex items-center gap-2 bg-ghost-green/10 border border-ghost-green/30 px-3 py-2">
                  <CheckCircle size={14} className="text-ghost-green shrink-0" />
                  <span className="text-ghost-green text-xs">{regSuccess}</span>
                </div>
              )}

              <button type="submit" disabled={regLoading} className="btn-gold w-full py-3 justify-center flex disabled:opacity-50 disabled:cursor-not-allowed">{regLoading ? 'INSCRIPTION...' : "S'INSCRIRE"}</button>
            </form>

            <p className="text-ghost-gray text-xs text-center mt-6">Déjà un compte ?{' '}<span onClick={() => onNavigate('login')} className="text-ghost-gold font-barlow font-bold cursor-pointer hover:underline">Se connecter</span></p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
