import React, { useState, useEffect, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout/Layout';
import Login from './views/Login';
import PublicConsultation from './views/PublicConsultation';
import { Loader2 } from 'lucide-react';
import NewCaseModal from './components/modals/NewCaseModal';
import GlobalSearchModal from './components/modals/GlobalSearchModal';
// Removed Enum import to prevent crash
// import { CaseType } from './types'; 

// --- LAZY LOADING (CARREGAMENTO SOB DEMANDA) ---
const Dashboard = React.lazy(() => import('./views/Dashboard'));
const Clients = React.lazy(() => import('./views/Clients'));
const WhatsApp = React.lazy(() => import('./views/WhatsApp'));
const Cases = React.lazy(() => import('./views/Cases'));
const Expertise = React.lazy(() => import('./views/Expertise'));
const Financial = React.lazy(() => import('./views/Financial'));
const OfficeExpenses = React.lazy(() => import('./views/OfficeExpenses'));
const FinancialCalendar = React.lazy(() => import('./views/FinancialCalendar'));
const Retirements = React.lazy(() => import('./views/Retirements'));
const CnisReader = React.lazy(() => import('./views/Tools/CnisReader'));
const GpsCalculator = React.lazy(() => import('./views/Tools/GpsCalculator'));
const DocumentBuilder = React.lazy(() => import('./views/Tools/DocumentBuilder'));
const Robots = React.lazy(() => import('./views/Tools/Robots'));
const DownloadPage = React.lazy(() => import('./views/DownloadPage'));
const Permissions = React.lazy(() => import('./views/Permissions'));

// Importação adaptada para Named Export (pois criamos export function Personal)
const Personal = React.lazy(() => import('./views/Personal').then(module => ({ default: module.Personal })));

// Componente de Carregamento para as transições de tela
const PageLoader = () => (
  <div className="h-full w-full flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="animate-spin text-yellow-600" size={40} />
      <p className="text-zinc-500 text-sm font-medium animate-pulse">Carregando módulo...</p>
    </div>
  </div>
);

// Componente auxiliar para manter a tela viva (Keep Alive) com Suspense
const View = React.memo<{
  id: string | string[];
  activeView: string;
  children: React.ReactNode
}>(({ id, activeView, children }) => {
  const ids = Array.isArray(id) ? id : [id];
  const isActive = ids.includes(activeView);

  if (!isActive) return null;

  return (
    <div className="h-full flex flex-col" style={{ height: '100%', width: '100%' }}>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </div>
  );
});

const AppContent: React.FC = () => {
  const { currentView, user, isLoading, events, isNewCaseModalOpen, setIsNewCaseModalOpen } = useApp();
  const [isPublicRoute, setIsPublicRoute] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const getForcedType = () => {
    // SAFE MODE: Use raw strings instead of ENUM to prevent "undefined" crash
    if (currentView === 'cases-insurance') return 'Seguro Defeso';
    if (currentView === 'cases-judicial') return 'Judicial';
    if (currentView === 'cases-administrative') return 'Administrativo';
    return undefined;
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/consulta') {
      setIsPublicRoute(true);
    }

    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Priority Check for shortcuts
      // ALT + T for Global Search
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        e.stopPropagation();
        setIsSearchOpen(prev => !prev);
      }
      // Keep Ctrl + K as alternative
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };

    // Use capture phase to try and intercept before browser default
    window.addEventListener('keydown', handleGlobalShortcuts, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalShortcuts, { capture: true });
  }, []);

  if (isPublicRoute) {
    return <PublicConsultation />;
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
          <p className="text-zinc-400 text-sm">Iniciando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <View id="dashboard" activeView={currentView}>
        <Dashboard />
      </View>

      <View id="clients" activeView={currentView}>
        <Clients />
      </View>

      <View id="whatsapp" activeView={currentView}>
        <WhatsApp />
      </View>

      <View
        id={['cases', 'cases-judicial', 'cases-administrative', 'cases-insurance']}
        activeView={currentView}
      >
        <Cases />
      </View>

      <View id="expertise" activeView={currentView}>
        <Expertise />
      </View>

      <View
        id={['financial', 'commissions']}
        activeView={currentView}
      >
        <Financial />
      </View>

      <View id="office-expenses" activeView={currentView}>
        <OfficeExpenses />
      </View>

      <View id="financial-calendar" activeView={currentView}>
        <FinancialCalendar />
      </View>

      <View id="retirements" activeView={currentView}>
        <Retirements />
      </View>

      <View id="cnis" activeView={currentView}>
        <CnisReader />
      </View>

      <View id="gps-calculator" activeView={currentView}>
        <GpsCalculator />
      </View>

      <View id="document-builder" activeView={currentView}>
        <DocumentBuilder />
      </View>

      <View id="robots" activeView={currentView}>
        <Robots />
      </View>

      {/* --- NOVA TELA PESSOAL --- */}
      <View id="personal" activeView={currentView}>
        <Personal />
      </View>
      {/* ------------------------- */}

      <View id="permissions" activeView={currentView}>
        <Permissions />
      </View>

      <View id="download" activeView={currentView}>
        <DownloadPage />
      </View>

      <NewCaseModal isOpen={isNewCaseModalOpen} onClose={() => setIsNewCaseModalOpen(false)} forcedType={getForcedType()} />
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
