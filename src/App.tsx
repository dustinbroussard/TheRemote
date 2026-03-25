import React, { useState, useEffect, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Activity, 
  Zap, 
  FileText, 
  LogOut, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Database, 
  RefreshCcw, 
  ShieldAlert,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

import { auth, db, googleProvider } from './firebase';
import { cn } from './lib/utils';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  SystemMetadata, 
  InventoryItem, 
  ErrorLog, 
  Trigger, 
  OperationType, 
  FirestoreErrorInfo 
} from './types';

// --- Error Handling ---
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const TabButton = ({ 
  active, 
  onClick, 
  icon: Icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: any; 
  label: string 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center flex-1 py-3 transition-all duration-200",
      active ? "text-primary-accent" : "text-gray-500 hover:text-gray-300"
    )}
  >
    <Icon size={20} className={active ? "mb-1" : "mb-1"} />
    <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
    {active && (
      <motion.div 
        layoutId="activeTab"
        className="absolute bottom-0 w-12 h-0.5 bg-primary-accent"
      />
    )}
  </button>
);

const Card = ({ children, title, icon: Icon, className }: { children: React.ReactNode; title?: string; icon?: any; className?: string }) => (
  <div className={cn("bg-bg-secondary border border-bg-tertiary p-4 rounded-sm mb-4", className)}>
    {title && (
      <div className="flex items-center gap-2 mb-4 border-b border-bg-tertiary pb-2">
        {Icon && <Icon size={16} className="text-tertiary-accent" />}
        <h2 className="text-[11px] uppercase tracking-widest font-bold text-gray-400">{title}</h2>
      </div>
    )}
    {children}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const isRunning = status === 'Running';
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight",
      isRunning ? "bg-primary-accent/10 text-primary-accent border border-primary-accent/20" : "bg-gray-800 text-gray-400 border border-gray-700"
    )}>
      <div className={cn("w-1.5 h-1.5 rounded-full", isRunning ? "bg-primary-accent animate-pulse" : "bg-gray-500")} />
      {status}
    </div>
  );
};

// --- Main App ---

function Dashboard({ metadata, inventory }: { metadata: SystemMetadata | null; inventory: InventoryItem[] }) {
  const lowStockItems = inventory.filter(item => item.count < (item.threshold || 50));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <Card title="Operational State" icon={Activity}>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] text-gray-500 uppercase mb-1">Current Status</div>
            <StatusBadge status={metadata?.status || 'Idle'} />
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Last Replenish</div>
            <div className="text-xs font-mono text-secondary-text">
              {metadata?.lastReplenishRun ? format(metadata.lastReplenishRun.toDate(), 'HH:mm:ss') : 'N/A'}
            </div>
          </div>
        </div>
        {metadata?.lastError && (
          <div className="mt-4 p-2 bg-danger/10 border border-danger/20 rounded-sm">
            <div className="flex items-center gap-2 text-danger text-[10px] font-bold uppercase mb-1">
              <ShieldAlert size={12} />
              Last Error
            </div>
            <p className="text-[10px] font-mono text-danger/80 line-clamp-2">{metadata.lastError}</p>
          </div>
        )}
      </Card>

      <Card title="Inventory Snapshot" icon={Database}>
        <div className="space-y-2">
          {inventory.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-xs italic">No inventory data available</div>
          ) : (
            inventory.map((item) => (
              <div key={item.bucketId} className="flex items-center justify-between py-2 border-b border-bg-tertiary last:border-0">
                <div>
                  <div className="text-xs font-bold text-gray-200">{item.category}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-tighter">{item.difficulty}</div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-sm font-mono font-bold",
                    item.count < (item.threshold || 50) ? "text-danger" : "text-primary-accent"
                  )}>
                    {item.count}
                  </div>
                  {item.count < (item.threshold || 50) && (
                    <div className="text-[8px] text-danger uppercase font-bold">Low Stock</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {lowStockItems.length > 0 && (
        <div className="bg-danger/10 border border-danger/30 p-3 rounded-sm flex items-center gap-3">
          <AlertTriangle className="text-danger" size={20} />
          <div>
            <div className="text-xs font-bold text-danger uppercase">Critical Alert</div>
            <div className="text-[10px] text-danger/80">{lowStockItems.length} buckets below threshold</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Actions({ inventory }: { inventory: InventoryItem[] }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [batchSize, setBatchSize] = useState(10);
  const [isTriggering, setIsTriggering] = useState(false);
  const [lastTriggerStatus, setLastTriggerStatus] = useState<string | null>(null);

  const categories = Array.from(new Set(inventory.map(i => i.category)));
  const difficulties = ['Easy', 'Medium', 'Hard'];

  const triggerAction = async (action: string, params?: any) => {
    setIsTriggering(true);
    setLastTriggerStatus(null);
    try {
      const path = 'triggers';
      await addDoc(collection(db, path), {
        action,
        params: params || {},
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setLastTriggerStatus('Success');
      setTimeout(() => setLastTriggerStatus(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'triggers');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <Card title="Global Triggers" icon={Zap}>
        <div className="grid grid-cols-1 gap-3">
          <button
            disabled={isTriggering}
            onClick={() => triggerAction('replenishAllBuckets')}
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
            onClick={() => triggerAction('runValidationSuite')}
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
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-bg-tertiary border border-bg-tertiary text-xs p-2 rounded-sm focus:border-primary-accent outline-none"
              >
                <option value="">Select...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Difficulty</label>
              <select 
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full bg-bg-tertiary border border-bg-tertiary text-xs p-2 rounded-sm focus:border-primary-accent outline-none"
              >
                <option value="">Select...</option>
                {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Batch Size</label>
            <input 
              type="number" 
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value))}
              className="w-full bg-bg-tertiary border border-bg-tertiary text-xs p-2 rounded-sm focus:border-primary-accent outline-none font-mono"
            />
          </div>

          <button
            disabled={isTriggering || !selectedCategory || !selectedDifficulty}
            onClick={() => triggerAction('replenishSelectedBucket', { category: selectedCategory, difficulty: selectedDifficulty, batchSize })}
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

function Logs({ logs }: { logs: ErrorLog[] }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <Card title="Recent Diagnostics" icon={FileText}>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-xs italic">No error logs detected</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-3 bg-bg-tertiary border-l-2 border-danger rounded-r-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[10px] font-bold text-danger uppercase tracking-widest">{log.stage}</div>
                  <div className="text-[9px] text-gray-500 font-mono">
                    {format(log.timestamp.toDate(), 'MM/dd HH:mm:ss')}
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

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'actions' | 'logs'>('status');
  const [metadata, setMetadata] = useState<SystemMetadata | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Check if already installed
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed');
      
      if (!isStandalone && !isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallBanner(false);
    
    // Store decision for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      setLoading(false);
      return;
    }

    // Real-time metadata
    const metaUnsub = onSnapshot(doc(db, 'metadata', 'system'), (snapshot) => {
      if (snapshot.exists()) {
        setMetadata(snapshot.data() as SystemMetadata);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'metadata/system'));

    // Real-time inventory
    const invUnsub = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ bucketId: doc.id, ...doc.data() } as InventoryItem));
      setInventory(items);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inventory'));

    // Real-time logs
    const logsQuery = query(collection(db, 'error_logs'), orderBy('timestamp', 'desc'), limit(20));
    const logsUnsub = onSnapshot(logsQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ErrorLog));
      setLogs(items);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'error_logs'));

    return () => {
      metaUnsub();
      invUnsub();
      logsUnsub();
    };
  }, [authReady, user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!authReady || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-primary-accent mb-4"
        >
          <RefreshCcw size={32} />
        </motion.div>
        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold animate-pulse">Initializing System...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary p-6">
        <div className="w-16 h-16 bg-bg-tertiary border border-bg-tertiary rounded-full flex items-center justify-center mb-8 shadow-2xl">
          <ShieldAlert size={32} className="text-primary-accent" />
        </div>
        <h1 className="text-xl font-bold mb-2 tracking-tight">Admin Terminal</h1>
        <p className="text-gray-500 text-xs text-center mb-10 max-w-[240px] leading-relaxed">
          Restricted access. Please identify yourself using your Google Identity Provider.
        </p>
        <button
          onClick={handleLogin}
          className="w-full max-w-[280px] py-4 bg-bg-tertiary border border-primary-accent text-primary-accent text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-primary-accent hover:text-bg-primary transition-all duration-300 flex items-center justify-center gap-3"
        >
          <Zap size={16} />
          Authenticate
        </button>
      </div>
    );
  }

  // Whitelist check (simulated based on instructions)
  const isAdmin = user.email === 'dustin.broussard@gmail.com';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary p-6 text-center">
        <AlertTriangle size={48} className="text-danger mb-4" />
        <h1 className="text-danger text-xl font-bold mb-2 uppercase">Access Denied</h1>
        <p className="text-gray-500 text-xs mb-8 leading-relaxed">
          Your identity ({user.email}) is not authorized for this terminal.
        </p>
        <button onClick={handleLogout} className="text-tertiary-accent text-[10px] uppercase font-bold tracking-widest border-b border-tertiary-accent pb-1">
          Switch Identity
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary text-white max-w-md mx-auto relative shadow-2xl">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-primary/80 backdrop-blur-md border-b border-bg-tertiary px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary-accent rounded-full animate-pulse" />
          <h1 className="text-[11px] uppercase tracking-[0.2em] font-black">Remote Control</h1>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-danger transition-colors">
          <LogOut size={16} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'status' && (
            <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard metadata={metadata} inventory={inventory} />
            </motion.div>
          )}
          {activeTab === 'actions' && (
            <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Actions inventory={inventory} />
            </motion.div>
          )}
          {activeTab === 'logs' && (
            <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Logs logs={logs} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-bg-secondary border-t border-bg-tertiary flex z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <TabButton 
          active={activeTab === 'status'} 
          onClick={() => setActiveTab('status')} 
          icon={Activity} 
          label="Status" 
        />
        <TabButton 
          active={activeTab === 'actions'} 
          onClick={() => setActiveTab('actions')} 
          icon={Zap} 
          label="Actions" 
        />
        <TabButton 
          active={activeTab === 'logs'} 
          onClick={() => setActiveTab('logs')} 
          icon={FileText} 
          label="Logs" 
        />
      </nav>

      {/* PWA Install Banner */}
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
              <button 
                onClick={handleDismissInstall}
                className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 hover:text-white transition-colors"
              >
                Later
              </button>
              <button 
                onClick={handleInstallClick}
                className="px-4 py-1.5 bg-primary-accent text-bg-primary text-[10px] font-bold uppercase tracking-widest rounded-sm hover:opacity-90 transition-opacity"
              >
                Install
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
