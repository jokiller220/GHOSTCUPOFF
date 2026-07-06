import { useState, FormEvent } from 'react';
import { Eye, EyeOff, AlertCircle, Crosshair } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Page } from '../types';

interface LoginPageProps {
  onNavigate: (page: Page) => void;
}

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const { signIn } = useAuth();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const { error } = await signIn(loginId, loginPassword);
    setLoginLoading(false);
    if (error) { setLoginError(error); return; }
    onNavigate('dashboard');
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
          <div className="bg-ghost-dark p-8 md:p-10 border border-ghost-border">
            <div className="mb-8">
              <h2 className="font-barlow font-black text-2xl text-white uppercase tracking-wide mb-1">CONNEXION</h2>
              <div className="w-10 h-0.5 bg-ghost-gold" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">
                  Email ou Pseudo Call of Duty
                </label>
                <input
                  type="text"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  placeholder="Entrez votre email ou pseudo"
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
              <span onClick={() => onNavigate('register')} className="text-ghost-gold font-barlow font-bold cursor-pointer hover:underline">
                Créer un compte
              </span>
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
