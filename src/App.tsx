import { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Page } from './types';

// Layouts
import PublicLayout from './components/PublicLayout';
import DashboardLayout from './components/DashboardLayout';
import AdminLayout from './components/AdminLayout';

// Public pages
import Home from './pages/Home';
import Reglement from './pages/Reglement';
import Recompenses from './pages/Recompenses';
import BracketPage from './pages/BracketPage';
import PlanningPage from './pages/PlanningPage';

// Auth
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Player pages
import DashboardPage from './pages/DashboardPage';
import MesMatchsPage from './pages/MesMatchsPage';
import MonEquipePage from './pages/MonEquipePage';
import NotificationsPage from './pages/NotificationsPage';
import ParametresPage from './pages/ParametresPage';
import MatchDetailPage from './pages/MatchDetailPage';
import PreuveScorePage from './pages/PreuveScorePage';

// Admin pages
import AdminDashboard from './pages/AdminDashboard';
import AdminMatchsPage from './pages/AdminMatchsPage';
import AdminMatchDetailPage from './pages/AdminMatchDetailPage';
import AdminJoueursPage from './pages/AdminJoueursPage';
import AdminAnnoncesPage from './pages/AdminAnnoncesPage';
import AdminBracketsPage from './pages/AdminBracketsPage';
import AdminPlanningPage from './pages/AdminPlanningPage';
import AdminFFAPage from './pages/AdminFFAPage';

const PLAYER_PAGES: Page[] = ['dashboard', 'mes-matchs', 'mon-equipe', 'notifications', 'parametres', 'match-detail', 'preuve-score'];
const ADMIN_PAGES: Page[] = ['admin', 'admin-matchs', 'admin-joueurs', 'admin-brackets', 'admin-annonces', 'admin-match-detail', 'admin-planning', 'admin-ffa'];

function AppContent() {
  const { profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const hash = window.location.hash.replace('#', '');
    return hash ? (hash.split('/')[0] as Page) : 'home';
  });
  const [pageData, setPageData] = useState<unknown>(() => {
    const hash = window.location.hash.replace('#', '');
    return hash.includes('/') ? hash.split('/')[1] : null;
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const parts = hash.split('/');
        setCurrentPage(parts[0] as Page);
        setPageData(parts[1] || null);
      } else {
        setCurrentPage('home');
        setPageData(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((page: Page, data?: unknown) => {
    let newHash = `#${page}`;
    if (data && typeof data === 'string') {
      newHash += `/${data}`;
    }
    
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    } else {
      // If we're already on the hash but want to force re-render, we set state manually
      setCurrentPage(page);
      setPageData(data ?? null);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-ghost-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-ghost-gold border-t-transparent rounded-full animate-spin" />
          <span className="font-barlow text-ghost-gray text-xs uppercase tracking-widest">Chargement...</span>
        </div>
      </div>
    );
  }

  // Login / Register pages (standalone, no layout)
  if (currentPage === 'login') return <LoginPage onNavigate={navigate} />;
  if (currentPage === 'register') return <RegisterPage onNavigate={navigate} />;

  // Admin layout
  if (ADMIN_PAGES.includes(currentPage) && profile?.role === 'admin') {
    return (
      <AdminLayout currentPage={currentPage} onNavigate={navigate}>
        {currentPage === 'admin' && <AdminDashboard onNavigate={navigate} />}
        {currentPage === 'admin-matchs' && <AdminMatchsPage onNavigate={navigate} />}
        {currentPage === 'admin-match-detail' && (
          <AdminMatchDetailPage matchId={pageData as string} onNavigate={navigate} />
        )}
        {currentPage === 'admin-joueurs' && <AdminJoueursPage />}
        {currentPage === 'admin-annonces' && <AdminAnnoncesPage />}
        {currentPage === 'admin-brackets' && <AdminBracketsPage onNavigate={navigate} />}
        {currentPage === 'admin-planning' && <AdminPlanningPage />}
        {currentPage === 'admin-ffa' && <AdminFFAPage />}
      </AdminLayout>
    );
  }

  // Player dashboard layout
  const isDashboardPage = PLAYER_PAGES.includes(currentPage) || ['bracket', 'planning'].includes(currentPage);
  if (isDashboardPage && profile) {
    return (
      <DashboardLayout currentPage={currentPage} onNavigate={navigate}>
        {currentPage === 'dashboard' && <DashboardPage onNavigate={navigate} />}
        {currentPage === 'mes-matchs' && <MesMatchsPage onNavigate={navigate} />}
        {currentPage === 'mon-equipe' && <MonEquipePage onNavigate={navigate} />}
        {currentPage === 'notifications' && <NotificationsPage />}
        {currentPage === 'parametres' && <ParametresPage onNavigate={navigate} />}
        {currentPage === 'bracket' && <BracketPage onNavigate={navigate} />}
        {currentPage === 'planning' && <PlanningPage onNavigate={navigate} />}
        {currentPage === 'match-detail' && (
          <MatchDetailPage matchId={pageData as string} onNavigate={navigate} />
        )}
        {currentPage === 'preuve-score' && (
          <PreuveScorePage matchId={pageData as string} onNavigate={navigate} />
        )}
      </DashboardLayout>
    );
  }

  // If accessing player/admin pages without being logged in, redirect to auth
  if ((PLAYER_PAGES.includes(currentPage) || ADMIN_PAGES.includes(currentPage)) && !profile) {
    return <LoginPage onNavigate={navigate} />;
  }

  // Public layout for all public pages + match-detail when not logged in
  return (
    <PublicLayout currentPage={currentPage} onNavigate={navigate}>
      {currentPage === 'home' && <Home onNavigate={navigate} />}
      {currentPage === 'reglement' && <Reglement />}
      {currentPage === 'recompenses' && <Recompenses />}
      {currentPage === 'bracket' && <BracketPage onNavigate={navigate} />}
      {currentPage === 'planning' && <PlanningPage onNavigate={navigate} />}
      {currentPage === 'match-detail' && (
        <MatchDetailPage matchId={pageData as string} onNavigate={navigate} />
      )}
    </PublicLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
