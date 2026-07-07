import { ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  Swords,
  Users,
  GitBranch,
  Megaphone,
  LogOut,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { Page } from '../types';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

interface AdminLayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const adminLinks: { label: string; page: Page; icon: ReactNode }[] = [
  { label: 'Tableau de Bord', page: 'admin', icon: <LayoutDashboard size={16} /> },
  { label: 'Matchs', page: 'admin-matchs', icon: <Swords size={16} /> },
  { label: 'Joueurs / Équipes', page: 'admin-joueurs', icon: <Users size={16} /> },
  { label: 'Brackets', page: 'admin-brackets', icon: <GitBranch size={16} /> },
  { label: 'Annonces', page: 'admin-annonces', icon: <Megaphone size={16} /> },
];

export default function AdminLayout({ children, currentPage, onNavigate }: AdminLayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  async function handleSignOut() {
    await signOut();
    onNavigate('home');
  }

  function handleNavigate(page: Page) {
    onNavigate(page);
    setSidebarOpen(false);
  }

  const currentLabel = adminLinks.find(l => l.page === currentPage)?.label ?? 'Tableau de Bord';

  return (
    <div className="min-h-[100dvh] bg-ghost-black flex relative">
      {/* Global Background Image */}
      <div 
        className="fixed inset-0 opacity-40 pointer-events-none z-0 mix-blend-lighten"
        style={{
          backgroundImage: `url("/bacgroungimg.jpg")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

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
          fixed top-0 left-0 h-full z-50 flex flex-col bg-ghost-dark/80 backdrop-blur-md border-r border-ghost-border/50
          transition-all duration-300
          ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          lg:translate-x-0 lg:z-40 ${desktopCollapsed ? 'lg:w-[60px]' : 'lg:w-52'}
        `}
      >
        {/* Logo + close mobile */}
        <div className={`p-4 border-b border-ghost-border/50 flex items-center gap-2 ${desktopCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!desktopCollapsed ? (
            <Logo onNavigate={(p) => handleNavigate(p as Page)} size="sm" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-ghost-gold flex items-center justify-center cursor-pointer" onClick={() => handleNavigate('home')}>
              <span className="font-barlow font-black text-black text-[10px]">G</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-ghost-gray hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Admin badge */}
        <div className={`py-3 border-b border-ghost-border/50 ${desktopCollapsed ? 'px-0 flex justify-center' : 'px-4'}`}>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-ghost-red" title="Admin Panel" />
            {!desktopCollapsed && <span className="text-ghost-red font-barlow font-black text-xs uppercase tracking-widest">Admin</span>}
          </div>
          {!desktopCollapsed && (
            <p className="text-ghost-gray text-[10px] uppercase tracking-wider mt-1 truncate">
              {profile?.cod_username ?? 'Admin'}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col py-2 overflow-y-auto">
          {adminLinks.map(({ label, page, icon }) => (
            <button
              key={label}
              onClick={() => handleNavigate(page)}
              title={desktopCollapsed ? label : undefined}
              className={`flex items-center gap-3 px-4 py-3 mx-2 my-0.5 rounded-xl transition-all duration-200 font-barlow font-bold text-xs uppercase tracking-widest ${
                currentPage === page
                  ? 'bg-ghost-gold/10 text-ghost-gold'
                  : 'text-ghost-gray hover:text-white hover:bg-white/5'
              } ${desktopCollapsed ? 'justify-center px-0' : ''}`}
            >
              <span className={currentPage === page ? 'text-ghost-gold' : 'text-ghost-gray'}>
                {icon}
              </span>
              {!desktopCollapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-ghost-border/50 flex justify-center">
          <button
            onClick={handleSignOut}
            title={desktopCollapsed ? 'Déconnexion' : undefined}
            className={`flex items-center gap-3 py-2 rounded-xl transition-all font-barlow font-bold text-xs uppercase tracking-widest text-ghost-red hover:text-red-400 hover:bg-red-950/20 ${desktopCollapsed ? 'justify-center px-2 w-auto' : 'px-4 w-full'}`}
          >
            <LogOut size={16} />
            {!desktopCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* === MAIN CONTENT === */}
      <div className={`flex-1 flex flex-col min-h-[100dvh] relative z-10 transition-all duration-300 ${desktopCollapsed ? 'lg:ml-[60px]' : 'lg:ml-52'}`}>

        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-ghost-dark/70 backdrop-blur-lg border-b border-ghost-border/50 px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger mobile & desktop toggle */}
            <button
              onClick={() => {
                setSidebarOpen(true);
                setDesktopCollapsed(!desktopCollapsed);
              }}
              className="text-ghost-gray hover:text-white p-1"
            >
              <Menu size={20} />
            </button>
            <Shield size={14} className="text-ghost-red hidden sm:block" />
            <span className="text-ghost-gray text-xs font-barlow uppercase tracking-widest hidden sm:block">Ghost Cup Admin</span>
            <span className="text-ghost-border hidden sm:block">/</span>
            <span className="text-white text-xs font-barlow font-bold uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">
              {currentLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-ghost-red/10 border border-ghost-red/30 rounded-full px-3 py-1.5 sm:px-4">
            <Shield size={12} className="text-ghost-red" />
            <span className="text-ghost-red text-[10px] font-barlow font-bold uppercase tracking-wider hidden sm:block">Mode Admin</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>

        {/* === BOTTOM NAV admin (mobile only) === */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-ghost-dark border-t border-ghost-border flex justify-around py-1 px-1">
          {adminLinks.slice(0, 4).map(({ label, page, icon }) => (
            <button
              key={page}
              onClick={() => handleNavigate(page)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 min-w-[50px] transition-colors ${
                currentPage === page ? 'text-ghost-gold' : 'text-ghost-gray'
              }`}
            >
              {icon}
              <span className="text-[9px] font-barlow font-bold uppercase tracking-wide leading-none">{label.split(' ')[0]}</span>
            </button>
          ))}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2 px-1 min-w-[50px] text-ghost-gray"
          >
            <Menu size={16} />
            <span className="text-[9px] font-barlow font-bold uppercase tracking-wide leading-none">Plus</span>
          </button>
        </nav>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          main { padding-bottom: 5rem !important; }
        }
      `}</style>
    </div>
  );
}
