import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  LogOut,
  RefreshCcw,
  ShieldAlert,
  Zap,
  Database as DatabaseIcon,
  LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { format } from 'date-fns';
import { HashRouter, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { getAdminIdentitySummary } from './config/admin';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { supabase } from './supabase';
import { useAdminData } from './hooks/useAdminData';
import { cn } from './lib/utils';
import { StatusScreen } from './screens/StatusScreen';
import { ErrorLog, InventoryItem, TableStat } from './types';
import { Database } from './supabase';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const tabs = [
  { to: '/status', label: 'Status', icon: Activity },
  { to: '/database', label: 'Database', icon: DatabaseIcon },
  { to: '/actions', label: 'Actions', icon: Zap },
  { to: '/logs', label: 'Logs', icon: FileText },
] as const;

function TabButton({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'relative flex flex-col items-center justify-center flex-1 py-3 transition-all duration-200',
          isActive ? 'text-primary-accent' : 'text-gray-500 hover:text-gray-300',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={20} className="mb-1" />
          <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
          {isActive && <motion.div layoutId="activeTab" className="absolute bottom-0 w-12 h-0.5 bg-primary-accent" />}
        </>
      )}
    </NavLink>
  );
}

function Card({
  children,
  title,
  icon: Icon,
  className,
}: {
  children: React.ReactNode;
  title?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn('bg-bg-secondary border border-bg-tertiary p-4 rounded-sm', className)}>
      {title && (
        <div className="flex items-center gap-2 mb-4 border-b border-bg-tertiary pb-2">
          {Icon && <Icon size={16} className="text-tertiary-accent" />}
          <h2 className="text-[11px] uppercase tracking-widest font-bold text-gray-400">{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="text-primary-accent mb-4"
      >
        <RefreshCcw size={32} />
      </motion.div>
      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold animate-pulse">
        Initializing System...
      </div>
    </div>
  );
}

function LoginScreen() {
  const { signIn } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary p-6">
      <div className="w-16 h-16 bg-bg-tertiary border border-bg-tertiary rounded-full flex items-center justify-center mb-8 shadow-2xl">
        <ShieldAlert size={32} className="text-primary-accent" />
      </div>
      <h1 className="text-xl font-bold mb-2 tracking-tight">Admin Terminal</h1>
      <p className="text-gray-500 text-xs text-center mb-3 max-w-[280px] leading-relaxed">
        Sign in with Google to access the trivia generation admin app.
      </p>
      <p className="text-gray-600 text-[10px] text-center mb-10 max-w-[280px] font-mono">
        Allowed identity: {getAdminIdentitySummary()}
      </p>
      <button
        onClick={() => void signIn()}
        className="w-full max-w-[280px] py-4 bg-bg-tertiary border border-primary-accent text-primary-accent text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-primary-accent hover:text-bg-primary transition-all duration-300 flex items-center justify-center gap-3"
      >
        <Zap size={16} />
        Sign In With Google
      </button>
    </div>
  );
}

function UnauthorizedScreen() {
  const { user, signOutUser } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary p-6 text-center">
      <AlertTriangle size={48} className="text-danger mb-4" />
      <h1 className="text-danger text-xl font-bold mb-2 uppercase">Access Denied</h1>
      <p className="text-gray-500 text-xs mb-3 leading-relaxed">
        Your account ({user?.email || user?.id || 'unknown'}) is not authorized for this terminal.
      </p>
      <p className="text-gray-600 text-[10px] mb-8 font-mono">{getAdminIdentitySummary()}</p>
      <button
        onClick={() => void signOutUser()}
        className="text-tertiary-accent text-[10px] uppercase font-bold tracking-widest border-b border-tertiary-accent pb-1"
      >
        Switch Identity
      </button>
    </div>
  );
}

function RequireAdmin() {
  const { authReady, user, isAdmin } = useAuth();

  if (!authReady) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <UnauthorizedScreen />;
  }

  return <Outlet />;
}

function ActionsScreen({ inventory }: { inventory: InventoryItem[] }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [batchSize, setBatchSize] = useState(10);
  const [isTriggering, setIsTriggering] = useState(false);
  const [lastTriggerStatus, setLastTriggerStatus] = useState<string | null>(null);

  const categories = Array.from(new Set(inventory.map((item) => item.category)));
  const difficulties = ['Easy', 'Medium', 'Hard'];

  const triggerAction = async (action: string, params?: Record<string, unknown>) => {
    setIsTriggering(true);
    setLastTriggerStatus(null);
    try {
      const triggerRecord: Database['public']['Tables']['triggers']['Insert'] = {
        action,
        params: params || {},
        status: 'pending',
        timestamp: new Date().toISOString(),
      };

      await supabase.from('triggers').insert(triggerRecord as never);
      setLastTriggerStatus('Success');
      window.setTimeout(() => setLastTriggerStatus(null), 3000);
    } catch (error) {
      console.error('Trigger error:', error);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
      <Card title="Global Triggers" icon={Zap}>
        <div className="grid grid-cols-1 gap-3">
          <button
            disabled={isTriggering}
            onClick={() => void triggerAction('replenishAllBuckets')}
            className="flex items-center justify-between w-full p-4 bg-bg-tertiary border border-primary-accent/30 text-primary-accent rounded-sm hover:bg-primary-accent/10 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <RefreshCcw size={18} />
              <div className="text-left">
                <div className="text-xs font-bold uppercase">Replenish All</div>
                <div className="text-[9px] text-primary-accent/60 uppercase">Full System Refresh</div>
              </div>
            </div>
            <ChevronRight size={16} />
          </button>

          <button
            disabled={isTriggering}
            onClick={() => void triggerAction('runValidationSuite')}
            className="flex items-center justify-between w-full p-4 bg-bg-tertiary border border-tertiary-accent/30 text-tertiary-accent rounded-sm hover:bg-tertiary-accent/10 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} />
              <div className="text-left">
                <div className="text-xs font-bold uppercase">Run Validation</div>
                <div className="text-[9px] text-tertiary-accent/60 uppercase">Integrity Check</div>
              </div>
            </div>
            <ChevronRight size={16} />
          </button>
        </div>
      </Card>

      <Card title="Targeted Controls" icon={Zap}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="w-full bg-bg-tertiary border border-bg-tertiary text-xs p-2 rounded-sm focus:border-primary-accent outline-none"
              >
                <option value="">Select...</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(event) => setSelectedDifficulty(event.target.value)}
                className="w-full bg-bg-tertiary border border-bg-tertiary text-xs p-2 rounded-sm focus:border-primary-accent outline-none"
              >
                <option value="">Select...</option>
                {difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Batch Size</label>
            <input
              type="number"
              min={1}
              value={batchSize}
              onChange={(event) => setBatchSize(Number.parseInt(event.target.value, 10) || 1)}
              className="w-full bg-bg-tertiary border border-bg-tertiary text-xs p-2 rounded-sm focus:border-primary-accent outline-none font-mono"
            />
          </div>

          <button
            disabled={isTriggering || !selectedCategory || !selectedDifficulty}
            onClick={() =>
              void triggerAction('replenishSelectedBucket', {
                category: selectedCategory,
                difficulty: selectedDifficulty,
                batchSize,
              })
            }
            className="w-full py-3 bg-primary-accent text-bg-primary text-xs font-bold uppercase tracking-widest rounded-sm hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            {isTriggering ? 'Processing...' : 'Replenish Selected'}
          </button>

          {lastTriggerStatus && (
            <div className="text-center text-[10px] text-secondary-text font-bold uppercase animate-pulse">
              Trigger Sent Successfully
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function LogsScreen({ logs }: { logs: ErrorLog[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
      <Card title="Recent Diagnostics" icon={FileText}>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-xs italic">No error logs detected</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-3 bg-bg-tertiary border-l-2 border-danger rounded-r-sm">
                <div className="flex justify-between items-start mb-2 gap-4">
                  <div className="text-[10px] font-bold text-danger uppercase tracking-widest">{log.stage}</div>
                  <div className="text-[9px] text-gray-500 font-mono">
                    {format(new Date(log.timestamp), 'MM/dd HH:mm:ss')}
                  </div>
                </div>
                <div className="text-[11px] text-gray-300 mb-2 font-mono leading-relaxed">{log.message}</div>
                {log.bucketId && (
                  <div className="inline-block px-1.5 py-0.5 bg-bg-primary text-[8px] text-gray-500 font-mono rounded-sm border border-bg-tertiary">
                    BUCKET: {log.bucketId}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function DatabaseScreen({ stats }: { stats: TableStat[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
      <Card title="Database Overview" icon={DatabaseIcon}>
        <div className="space-y-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Public Schema Tables</p>
          <div className="grid grid-cols-1 gap-2">
            {stats.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-xs italic">No table statistics available</div>
            ) : (
              stats.map((stat) => (
                <div key={stat.name} className="flex items-center justify-between p-3 bg-bg-tertiary border border-bg-tertiary rounded-sm">
                  <div className="flex items-center gap-2">
                    <DatabaseIcon size={14} className="text-primary-accent" />
                    <span className="text-xs font-bold text-gray-200">{stat.name}</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-primary-accent">{stat.count} rows</div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
      
      <Card title="System Health" icon={ShieldAlert}>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold">
            <span className="text-gray-500">Real-time Connection</span>
            <span className="text-success">Active</span>
          </div>
          <div className="flex items-center justify-between text-[10px] uppercase font-bold">
            <span className="text-gray-500">Auth Service</span>
            <span className="text-success">Online</span>
          </div>
          <div className="flex items-center justify-between text-[10px] uppercase font-bold">
            <span className="text-gray-500">Storage API</span>
            <span className="text-tertiary-accent">Standby</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function AppShell() {
  const { signOutUser, authReady, user, isAdmin } = useAuth();
  const { metadata, inventory, logs, tableStats, loading } = useAdminData(authReady && !!user && isAdmin);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);

      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed');

      if (!isStandalone && !isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary text-white max-w-md mx-auto relative shadow-2xl">
      <header className="sticky top-0 z-20 bg-bg-primary/80 backdrop-blur-md border-b border-bg-tertiary px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary-accent rounded-full animate-pulse" />
          <h1 className="text-[11px] uppercase tracking-[0.2em] font-black">Supabase Monitor</h1>
        </div>
        <button
          aria-label="Sign out"
          onClick={() => void signOutUser()}
          className="text-gray-500 hover:text-danger transition-colors"
        >
          <LogOut size={16} />
        </button>
      </header>

      <main className="flex-1 p-6 pb-24 overflow-y-auto">
        <Routes>
          <Route index element={<Navigate to="/status" replace />} />
          <Route path="/status" element={<StatusScreen metadata={metadata} inventory={inventory} />} />
          <Route path="/database" element={<DatabaseScreen stats={tableStats} />} />
          <Route path="/actions" element={<ActionsScreen inventory={inventory} />} />
          <Route path="/logs" element={<LogsScreen logs={logs} />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-bg-secondary border-t border-bg-tertiary flex z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {tabs.map((tab) => (
          <TabButton key={tab.to} to={tab.to} icon={tab.icon} label={tab.label} />
        ))}
      </nav>

      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40 bg-bg-tertiary border border-primary-accent p-4 rounded-sm shadow-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-accent/10 rounded-sm flex items-center justify-center text-primary-accent">
                <RefreshCcw size={20} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-tight">Install RC Admin</div>
                <div className="text-[9px] text-gray-500 uppercase">Fast access from your home screen</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDismissInstall} className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 hover:text-white transition-colors">
                Later
              </button>
              <button onClick={() => void handleInstallClick()} className="px-4 py-1.5 bg-primary-accent text-bg-primary text-[10px] font-bold uppercase tracking-widest rounded-sm hover:opacity-90 transition-opacity">
                Install
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppRoutes() {
  const { authReady, user, isAdmin } = useAuth();

  if (!authReady) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={isAdmin ? '/status' : '/unauthorized'} replace /> : <LoginScreen />} />
      <Route path="/unauthorized" element={user ? <UnauthorizedScreen /> : <Navigate to="/login" replace />} />
      <Route element={<RequireAdmin />}>
        <Route path="/*" element={<AppShell />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
