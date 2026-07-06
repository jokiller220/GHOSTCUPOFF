import { ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  Swords,
  Users,
  GitBranch,
  Bell,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  Home,
  FileText,
  Gift,
} from 'lucide-react';
import { Page } from '../types';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const playerLinks: { label: string; page: Page; icon: ReactNode }[] = [
  { label: 'Dashboard', page: 'dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Mes Matchs', page: 'mes-matchs', icon: <Swords size={16} /> },
  { label: "Mon Équipe", page: 'mon-equipe', icon: <Users size={16} /> },
  { label: 'Classement', page: 'bracket', icon: <GitBranch size={16} /> },
  { label: 'Notifications', page: 'notifications', icon: <Bell size={16} /> },
  { label: 'Paramètres', page: 'parametres', icon: <Settings size={16} /> },
];

export default function DashboardLayout({ children, currentPage, onNavigate }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    onNavigate('home');
  }

  function handleNavigate(page: Page) {
    onNavigate(page);
    setSidebarOpen(false);
  }

  const currentLabel = playerLinks.find(l => l.page === currentPage)?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen bg-ghost-black flex">

      {/* === MOBILE OVERLAY === */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* === SIDEBAR === */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          w-64 bg-ghost-dark border-r border-ghost-border
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:w-52 lg:z-40
        `}
      >
        {/* Logo + close mobile */}
        <div className="p-4 border-b border-ghost-border flex items-center justify-between">
          <Logo onNavigate={(p) => handleNavigate(p as Page)} size="sm" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-ghost-gray hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-ghost-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-ghost-gold/20 border border-ghost-gold/40 flex items-center justify-center shrink-0">
              <span className="text-ghost-gold font-barlow font-black text-xs">
                {profile?.cod_username?.[0]?.toUpperCase() ?? 'G'}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-barlow font-bold text-xs uppercase truncate">
                {profile?.cod_username ?? 'Joueur'}
              </p>
              <p className="text-ghost-gray text-[10px] uppercase tracking-wider">
                {profile?.role === 'admin' ? 'Admin' : 'Joueur'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col py-2 overflow-y-auto">
          {playerLinks.map(({ label, page, icon }) => (
            <button
              key={page}
              onClick={() => handleNavigate(page)}
              className={currentPage === page ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <span className={currentPage === page ? 'text-ghost-gold' : 'text-ghost-gray'}>
                {icon}
              </span>
              {label}
            </button>
          ))}

          <div className="mx-4 my-2 border-t border-ghost-border" />
          <button
            onClick={() => handleNavigate('home')}
            className={currentPage === 'home' ? 'sidebar-link-active' : 'sidebar-link'}
          >
            <span className={currentPage === 'home' ? 'text-ghost-gold' : 'text-ghost-gray'}>
              <Home size={16} />
            </span>
            Site public
          </button>
          <button
            onClick={() => handleNavigate('reglement')}
            className={currentPage === 'reglement' ? 'sidebar-link-active' : 'sidebar-link'}
          >
            <span className={currentPage === 'reglement' ? 'text-ghost-gold' : 'text-ghost-gray'}>
              <FileText size={16} />
            </span>
            Règlement
          </button>
          <button
            onClick={() => handleNavigate('recompenses')}
            className={currentPage === 'recompenses' ? 'sidebar-link-active' : 'sidebar-link'}
          >
            <span className={currentPage === 'recompenses' ? 'text-ghost-gold' : 'text-ghost-gray'}>
              <Gift size={16} />
            </span>
            Récompenses
          </button>

          {profile?.role === 'admin' && (
            <>
              <div className="mx-4 my-2 border-t border-ghost-border" />
              <button
                onClick={() => handleNavigate('admin')}
                className={currentPage === 'admin' || currentPage.startsWith('admin') ? 'sidebar-link-active' : 'sidebar-link'}
              >
                <Shield size={16} className="text-ghost-red" />
                Admin Panel
              </button>
            </>
          )}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-ghost-border">
          <button
            onClick={handleSignOut}
            className="sidebar-link w-full text-ghost-red hover:text-red-400 hover:bg-red-950/20"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* === MAIN CONTENT === */}
      <div className="flex-1 lg:ml-52 flex flex-col min-h-screen">

        {/* Top bar — mobile hamburger + breadcrumb */}
        <header className="sticky top-0 z-30 bg-ghost-dark/95 backdrop-blur border-b border-ghost-border px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-ghost-gray hover:text-white p-1"
            >
              <Menu size={20} />
            </button>
            <span className="text-ghost-gray text-xs font-barlow uppercase tracking-widest hidden sm:block">Ghost Cup</span>
            <span className="text-ghost-border hidden sm:block">/</span>
            <span className="text-white text-xs font-barlow font-bold uppercase tracking-widest">{currentLabel}</span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => handleNavigate('notifications')} className="relative text-ghost-gray hover:text-white transition-colors p-1">
              <Bell size={18} />
            </button>
            <button onClick={() => handleNavigate('parametres')} className="text-ghost-gray hover:text-white transition-colors p-1">
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>

        {/* === BOTTOM NAV (mobile only) === */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-ghost-dark border-t border-ghost-border flex justify-around py-1 px-2">
          {playerLinks.slice(0, 4).map(({ label, page, icon }) => {
            // Clean up labels for mobile (e.g. "Mes Matchs" -> "Matchs")
            const mobileLabel = label.replace('Mes ', '').replace('Mon ', '');
            return (
              <button
                key={page}
                onClick={() => handleNavigate(page)}
                className={`flex flex-col items-center gap-1 py-2 px-3 min-w-[60px] transition-colors ${
                  currentPage === page ? 'text-ghost-gold' : 'text-ghost-gray'
                }`}
              >
                {icon}
                <span className="text-[10px] font-barlow font-bold uppercase tracking-wide leading-none">
                  {mobileLabel}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom padding on mobile to account for bottom nav */}
      <style>{`
        @media (max-width: 1023px) {
          main { padding-bottom: 5rem !important; }
        }
      `}</style>
    </div>
  );
}
