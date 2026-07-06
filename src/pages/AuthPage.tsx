import { useState, FormEvent } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle, Crosshair } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Page } from '../types';

interface AuthPageProps {
  onNavigate: (page: Page) => void;
}

const START_DATE = '2026-07-08T00:00:00';

export default function AuthPage({ onNavigate }: AuthPageProps) {
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);

  import { useEffect } from 'react';
  
  useEffect(() => {
    const checkDate = () => {
      setIsRegistrationClosed(new Date() >= new Date(START_DATE));
    };
    checkDate();
    const interval = setInterval(checkDate, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sign in state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign up state
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

  const { signIn, signUp } = useAuth();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoginLoading(false);
    if (error) { setLoginError(error); return; }
    onNavigate('dashboard');
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    if (regPassword !== regConfirm) { setRegError('Les mots de passe ne correspondent pas.'); return; }
    if (!regAccepted) { setRegError('Vous devez accepter le règlement du tournoi.'); return; }
    if (regPassword.length < 6) { setRegError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setRegLoading(true);
    const { error } = await signUp(regEmail, regPassword, regCod, regName);
    setRegLoading(false);
    if (error) { setRegError(error); return; }
    setRegSuccess('Inscription réussie ! Redirection...');
    setTimeout(() => onNavigate('dashboard'), 1500);
  }

  return (
    <div className="min-h-screen bg-ghost-black flex flex-col">
      {/* Top bar */}
      <div className="bg-ghost-dark border-b border-ghost-border h-14 flex items-center px-6">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2 group">
          <Crosshair size={20} className="text-ghost-gold" strokeWidth={1.5} />
          <span className="font-barlow font-black text-white text-base uppercase tracking-widest">
            GHOST <span className="text-ghost-gold">CUP</span>
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          {/* Background decoration */}
          <div className="relative">
            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-ghost-border">
              {/* CONNEXION */}
              <div className="bg-ghost-dark p-8 md:p-10 border-b md:border-b-0 md:border-r border-ghost-border">
                <div className="mb-8">
                  <h2 className="font-barlow font-black text-2xl text-white uppercase tracking-wide mb-1">CONNEXION</h2>
                  <div className="w-10 h-0.5 bg-ghost-gold" />
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">
                      Email
                    </label>
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="Entrez votre email"
                      className="input-dark"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="Entrez votre mot de passe"
                        className="input-dark pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ghost-gray hover:text-white transition-colors"
                      >
                        {showLoginPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <div className="flex justify-end mt-1">
                      <button type="button" className="text-ghost-gray text-xs font-barlow hover:text-ghost-gold transition-colors">
                        Mot de passe oublié ?
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="remember"
                      className="w-3.5 h-3.5 accent-ghost-gold"
                    />
                    <label htmlFor="remember" className="text-ghost-gray text-xs font-barlow">
                      Se souvenir de moi
                    </label>
                  </div>

                  {loginError && (
                    <div className="flex items-center gap-2 bg-ghost-red/10 border border-ghost-red/30 px-3 py-2">
                      <AlertCircle size={14} className="text-ghost-red shrink-0" />
                      <span className="text-ghost-red text-xs">{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="btn-gold w-full py-3 justify-center flex disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loginLoading ? 'CONNEXION...' : 'SE CONNECTER'}
                  </button>
                </form>

                <p className="text-ghost-gray text-xs text-center mt-6">
                  Pas encore de compte ?{' '}
                  <span className="text-ghost-gold font-barlow font-bold cursor-pointer hover:underline">
                    Inscrivez-vous
                  </span>
                </p>
              </div>

              {/* INSCRIPTION */}
              <div className="bg-ghost-card p-8 md:p-10">
                <div className="mb-8">
                  <h2 className="font-barlow font-black text-2xl text-ghost-gold uppercase tracking-wide mb-1">INSCRIPTION</h2>
                  <div className="w-10 h-0.5 bg-ghost-gold" />
                </div>

                {isRegistrationClosed ? (
                  <div className="text-center py-12">
                    <h3 className="font-barlow font-black text-xl text-white uppercase mb-2">Inscriptions terminées</h3>
                    <p className="text-ghost-gray text-sm">Les inscriptions pour la Ghost Cup 2026 sont officiellement clôturées.</p>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">
                        Pseudo COD
                      </label>
                      <input
                        type="text"
                        value={regCod}
                        onChange={e => setRegCod(e.target.value)}
                        placeholder="Votre pseudo Call of Duty"
                        className="input-dark"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">
                        Prénom
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="Votre prénom réel"
                        className="input-dark"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="votre@email.com (optionnel)"
                        className="input-dark"
                      />
                    </div>

                    <div>
                      <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">
                        Mot de passe
                      </label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          placeholder="Créez votre mot de passe"
                          className="input-dark pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ghost-gray hover:text-white transition-colors"
                        >
                          {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">
                        Confirmer le mot de passe
                      </label>
                      <input
                        type="password"
                        value={regConfirm}
                        onChange={e => setRegConfirm(e.target.value)}
                        placeholder="Confirmez votre mot de passe"
                        className="input-dark"
                        required
                      />
                    </div>

                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="accept"
                        checked={regAccepted}
                        onChange={e => setRegAccepted(e.target.checked)}
                        className="w-3.5 h-3.5 accent-ghost-gold mt-0.5 shrink-0"
                      />
                      <label htmlFor="accept" className="text-ghost-gray text-xs font-barlow leading-relaxed">
                        J'accepte le{' '}
                        <span className="text-ghost-gold cursor-pointer hover:underline">règlement du tournoi</span>
                      </label>
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

                    <button
                      type="submit"
                      disabled={regLoading}
                      className="btn-gold w-full py-3 justify-center flex disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {regLoading ? 'INSCRIPTION...' : "S'INSCRIRE"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
