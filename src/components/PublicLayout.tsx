import { ReactNode, useState } from 'react';
import { Menu, X, User } from 'lucide-react';
import { Page } from '../types';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

interface PublicLayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navLinks: { label: string; page: Page }[] = [
  { label: 'Accueil', page: 'home' },
  { label: 'Règlement', page: 'reglement' },
  { label: 'Récompenses', page: 'recompenses' },
  { label: 'Bracket', page: 'bracket' },
  { label: 'Planning', page: 'planning' },
];

export default function PublicLayout({ children, currentPage, onNavigate }: PublicLayoutProps) {
  const { profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-ghost-black flex flex-col">
      {/* Top navbar */}
      <header className="sticky top-0 z-50 bg-ghost-dark/95 backdrop-blur border-b border-ghost-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-8">
          <Logo onNavigate={onNavigate} size="sm" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navLinks.map(({ label, page }) => (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className={`px-3 py-1.5 text-xs font-barlow font-bold uppercase tracking-widest transition-colors duration-200 ${
                  currentPage === page
                    ? 'text-ghost-gold'
                    : 'text-ghost-gray hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-2">
            {profile ? (
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2 btn-gold text-xs"
              >
                <User size={14} />
                {profile.cod_username}
              </button>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('login')}
                  className="btn-outline text-xs py-2 px-4"
                >
                  CONNEXION
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="btn-gold text-xs py-2 px-4"
                >
                  INSCRIPTION
                </button>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-ghost-gray hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-ghost-dark border-t border-ghost-border px-4 py-4 animate-fade-in">
            <nav className="flex flex-col gap-1 mb-4">
              {navLinks.map(({ label, page }) => (
                <button
                  key={page}
                  onClick={() => { onNavigate(page); setMobileOpen(false); }}
                  className={`text-left px-3 py-2.5 text-sm font-barlow font-bold uppercase tracking-widest transition-colors ${
                    currentPage === page ? 'text-ghost-gold' : 'text-ghost-gray hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className="flex gap-2 border-t border-ghost-border pt-4">
              {profile ? (
                <button onClick={() => { onNavigate('dashboard'); setMobileOpen(false); }} className="btn-gold text-xs w-full justify-center flex items-center gap-2">
                  <User size={14} /> Dashboard
                </button>
              ) : (
                <>
                  <button onClick={() => { onNavigate('login'); setMobileOpen(false); }} className="btn-outline text-xs flex-1">Connexion</button>
                  <button onClick={() => { onNavigate('register'); setMobileOpen(false); }} className="btn-gold text-xs flex-1">Inscription</button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Sidebar + content layout for interior pages */}
      {currentPage !== 'home' ? (
        <div className="flex flex-1">
          {/* Left sidebar for public pages */}
          <aside className="hidden lg:flex flex-col w-48 bg-ghost-dark border-r border-ghost-border shrink-0">
            <div className="p-6">
              <Logo onNavigate={onNavigate} size="sm" />
            </div>
            <nav className="flex flex-col mt-2">
              {[
                { label: 'Accueil', page: 'home' as Page },
                { label: 'Règlement', page: 'reglement' as Page },
                { label: 'Récompenses', page: 'recompenses' as Page },
                { label: 'Bracket', page: 'bracket' as Page },
                { label: 'Planning', page: 'planning' as Page },
                { label: 'FAQ', page: 'home' as Page },
                { label: 'Contact', page: 'home' as Page },
              ].map(({ label, page }) => (
                <button
                  key={label}
                  onClick={() => onNavigate(page)}
                  className={currentPage === page ? 'sidebar-link-active' : 'sidebar-link'}
                >
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      ) : (
        <main className="flex-1">
          {children}
        </main>
      )}

    </div>
  );
}
