import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Store, 
  Building2, 
  MapPin, 
  Info, 
  RefreshCw,
  AlertCircle,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { Shop, AppUser } from './types';
import { 
  fetchShops, 
  clearAllShopsAndTransactions, 
  fetchUserAccessRecord, 
  requestUserAccess 
} from './dataService';
import { SearchPage } from './components/SearchPage';
import { ShopDetailsPage } from './components/ShopDetailsPage';
import { StoreInfoPage } from './components/StoreInfoPage';
import { AuthModal } from './components/AuthModal';
import { AccessGateModal } from './components/AccessGateModal';
import { 
  AdminPasswordGate, 
  isLocalAdminAuthenticated, 
  clearLocalAdminAuthenticated 
} from './components/AdminPasswordGate';
import { AdminActionPasswordModal } from './components/AdminActionPasswordModal';

type NavTab = 'search' | 'store_info';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // User permission / access whitelist state
  const [userAccess, setUserAccess] = useState<AppUser | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);

  // Admin access state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isLocalAdminAuthenticated());
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [pendingGlobalAction, setPendingGlobalAction] = useState<{
    actionTitle: string;
    actionDescription?: string;
    onExecute: () => Promise<void>;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>('search');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active viewing/selected shop for details view
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  // Shop selected for direct editing in Store Info
  const [editingShopFromDetails, setEditingShopFromDetails] = useState<Shop | null>(null);

  const [showAboutModal, setShowAboutModal] = useState(false);

  // Listen to browser URL path or hash (/admin or #admin)
  useEffect(() => {
    const checkAdminRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('/admin') || hash === '#admin') {
        if (isLocalAdminAuthenticated()) {
          setIsAdmin(true);
          setActiveTab('store_info');
        } else {
          setShowAdminLogin(true);
        }
      }
    };

    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('hashchange', checkAdminRoute);
    return () => {
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('hashchange', checkAdminRoute);
    };
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle Google Login
  const handleGoogleSignIn = async () => {
    try {
      setIsLoggingIn(true);
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign in popup was closed. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('Sign in popup was blocked by browser. Please allow popups.');
      } else {
        setAuthError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      clearLocalAdminAuthenticated();
      setIsAdmin(false);
      setShowAdminLogin(false);
      await signOut(auth);
      setSelectedShop(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const handleExitAdmin = () => {
    clearLocalAdminAuthenticated();
    setIsAdmin(false);
    setShowAdminLogin(false);
    setActiveTab('search');
    // Clean URL if #admin or /admin
    if (window.location.hash === '#admin') {
      window.history.pushState(null, '', window.location.pathname);
    } else if (window.location.pathname.includes('/admin')) {
      window.history.pushState(null, '', '/');
    }
  };

  // Load shops from Firestore once authenticated and permitted
  const loadShops = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchShops();
      setShops(data);

      if (selectedShop) {
        const updated = data.find((s) => s.id === selectedShop.id);
        if (updated) setSelectedShop(updated);
      }
    } catch (err: any) {
      console.error('Failed to load shops:', err);
      setError('Could not connect to database. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check user permission whitelist status
  const checkUserAccess = async (user: User) => {
    try {
      setCheckingAccess(true);
      if (user.email) {
        const record = await fetchUserAccessRecord(user.email);
        setUserAccess(record);
      }
    } catch (err: any) {
      console.error('Failed to check user access record:', err);
    } finally {
      setCheckingAccess(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      checkUserAccess(currentUser);
    } else {
      setUserAccess(null);
    }
  }, [currentUser]);

  // Load shops if user is either permitted as approved user OR is local admin
  const isPermittedUser = userAccess?.status === 'approved' || isAdmin;
  const canEditShop = !!userAccess?.can_edit || isAdmin;

  useEffect(() => {
    if (currentUser && isPermittedUser) {
      loadShops();
    }
  }, [currentUser, isPermittedUser]);

  const handleRequestAccess = async (note: string) => {
    if (!currentUser || !currentUser.email) return;
    const rec = await requestUserAccess({
      email: currentUser.email,
      uid: currentUser.uid,
      displayName: currentUser.displayName || undefined,
      photoURL: currentUser.photoURL || undefined,
      request_note: note,
    });
    setUserAccess(rec);
  };

  const handleSelectShop = (shop: Shop) => {
    setSelectedShop(shop);
  };

  const handleBackToSearch = () => {
    setSelectedShop(null);
    setActiveTab('search');
  };

  const handleEditShopFromDetails = (shop: Shop) => {
    if (!isAdmin && !canEditShop) {
      setShowAdminLogin(true);
      return;
    }
    setEditingShopFromDetails(shop);
    setSelectedShop(null);
    setActiveTab('store_info');
  };

  // Auth gate check
  if (authChecking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-center p-4">
        <Building2 className="w-10 h-10 text-emerald-400 animate-pulse mb-3" />
        <div className="text-white font-semibold text-lg">Multiplan Center</div>
        <div className="text-xs text-neutral-500 mt-1">Verifying authentication...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthModal
        onSignInWithGoogle={handleGoogleSignIn}
        isLoading={isLoggingIn}
        error={authError}
      />
    );
  }

  // Permission Whitelist Gate: Only approved Google accounts (or active admin) can use the app
  if (!isPermittedUser) {
    return (
      <>
        <AccessGateModal
          currentUser={currentUser}
          accessRecord={userAccess}
          onRequestAccess={handleRequestAccess}
          onCheckStatus={async () => {
            await checkUserAccess(currentUser);
          }}
          onSignOut={handleSignOut}
        />

        {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-md">
              <AdminPasswordGate
                onSuccess={() => {
                  setIsAdmin(true);
                  setShowAdminLogin(false);
                  setActiveTab('store_info');
                }}
                onCancel={() => {
                  setShowAdminLogin(false);
                }}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Center Title */}
          <div 
            onClick={() => {
              setSelectedShop(null);
              setShowAdminLogin(false);
              setActiveTab('search');
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                Multiplan Center
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Dhaka
                </span>
                {isAdmin && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Admin Active
                  </span>
                )}
                {!isAdmin && canEditShop && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    Editor
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                Elephant Road · 14 Floors
              </div>
            </div>
          </div>

          {/* Clean Main Nav */}
          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="flex items-center p-1 bg-neutral-950/80 rounded-lg border border-neutral-800">
              <button
                onClick={() => {
                  setSelectedShop(null);
                  setShowAdminLogin(false);
                  setActiveTab('search');
                }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  activeTab === 'search' && !selectedShop && !showAdminLogin
                    ? 'bg-neutral-800 text-white shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Search Shops</span>
              </button>

              {/* Store Information tab appears if authorized as admin OR user has canEditShop permission */}
              {(isAdmin || canEditShop) && (
                <button
                  onClick={() => {
                    setSelectedShop(null);
                    setShowAdminLogin(false);
                    setActiveTab('store_info');
                  }}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                    activeTab === 'store_info' && !selectedShop
                      ? 'bg-neutral-800 text-white shadow-sm font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Store className={`w-4 h-4 ${isAdmin ? 'text-amber-400' : 'text-blue-400'}`} />
                  <span>Store Information</span>
                </button>
              )}
            </nav>

            {/* Subtle About / info toggle */}
            <button
              onClick={() => setShowAboutModal(true)}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="About this directory"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Admin Exit Button if logged in as admin */}
            {isAdmin && (
              <button
                onClick={handleExitAdmin}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-700/50 transition-colors cursor-pointer"
                title="Lock admin session"
              >
                Exit Admin
              </button>
            )}

            {/* User Profile & Sign Out */}
            <div className="flex items-center pl-2 ml-1 border-l border-neutral-800 gap-2">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-neutral-700 object-cover"
                  title={currentUser.displayName || currentUser.email || 'Logged in'}
                />
              ) : (
                <div 
                  className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 text-xs font-semibold"
                  title={currentUser.email || 'Logged in'}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
              )}

              <button
                onClick={handleSignOut}
                className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-800/80 rounded-xl text-red-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadShops}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-900/60 hover:bg-red-800 text-xs font-semibold rounded transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="min-h-[360px] flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <p className="text-white font-medium text-base">Loading Multiplan Center Directory...</p>
            <p className="text-xs text-neutral-500 mt-1">Connecting to database</p>
          </div>
        ) : showAdminLogin ? (
          /* Admin Password Prompt */
          <AdminPasswordGate
            onSuccess={() => {
              setIsAdmin(true);
              setShowAdminLogin(false);
              setActiveTab('store_info');
            }}
            onCancel={() => {
              setShowAdminLogin(false);
              setActiveTab('search');
            }}
          />
        ) : (
          <>
            {/* View 1: Shop Details Page */}
            {selectedShop ? (
              <ShopDetailsPage
                shop={selectedShop}
                currentUser={currentUser}
                isAdmin={isAdmin}
                canEditShop={canEditShop}
                onBack={handleBackToSearch}
                onEditShop={handleEditShopFromDetails}
              />
            ) : activeTab === 'search' ? (
              /* View 2: Search Page (Default for all users) */
              <SearchPage
                shops={shops}
                isAdmin={isAdmin}
                canEditShop={canEditShop}
                onSelectShop={handleSelectShop}
                onNavigateToStoreInfo={() => {
                  if (isAdmin || canEditShop) {
                    setActiveTab('store_info');
                  } else {
                    setShowAdminLogin(true);
                  }
                }}
              />
            ) : (isAdmin || canEditShop) ? (
              /* View 3: Store Information Page (For authenticated admin or permitted user editors) */
              <StoreInfoPage
                shops={shops}
                currentUserEmail={currentUser.email || ''}
                isAdmin={isAdmin}
                isUserEditor={!isAdmin && canEditShop}
                onRefreshShops={loadShops}
                onViewShop={(shop) => {
                  setSelectedShop(shop);
                }}
                initialEditingShop={editingShopFromDetails}
                onClearInitialEditingShop={() => setEditingShopFromDetails(null)}
              />
            ) : (
              <AdminPasswordGate
                onSuccess={() => {
                  setIsAdmin(true);
                  setActiveTab('store_info');
                }}
                onCancel={() => {
                  setActiveTab('search');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-4 text-xs text-neutral-500 text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Multiplan Center (ECS Computer City), New Elephant Road, Dhaka-1205 · 14 Floors Total</span>
          <div className="flex items-center gap-3">
            <span>Logged in as: <strong className="text-neutral-300 font-medium">{currentUser.email}</strong></span>
            {isAdmin && shops.length > 0 && (
              <button
                onClick={() => {
                  setPendingGlobalAction({
                    actionTitle: 'Clear All Database Shops',
                    actionDescription: 'Enter admin password to permanently delete all shops and their entire transaction histories from the Multiplan Center database.',
                    onExecute: async () => {
                      await clearAllShopsAndTransactions();
                      await loadShops();
                    },
                  });
                }}
                className="text-[11px] text-neutral-500 hover:text-red-400 underline transition-colors cursor-pointer"
              >
                Clear all database shops
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Admin Action Password Modal for Global Actions */}
      {pendingGlobalAction && (
        <AdminActionPasswordModal
          actionTitle={pendingGlobalAction.actionTitle}
          actionDescription={pendingGlobalAction.actionDescription}
          onSuccess={async () => {
            const execute = pendingGlobalAction.onExecute;
            setPendingGlobalAction(null);
            await execute();
          }}
          onClose={() => setPendingGlobalAction(null)}
        />
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-800">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Multiplan Center Manager</h3>
                <p className="text-xs text-neutral-400">Dhaka, Bangladesh · 14 Floors</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs text-neutral-300 leading-relaxed">
              <p>
                A clean, dedicated personal business tool for finding shops inside Multiplan Center and tracking purchase/sales transactions.
              </p>
              <div className="bg-neutral-950 p-3 rounded border border-neutral-800 space-y-1.5">
                <div className="font-semibold text-white">Role Access:</div>
                <div>• <strong>Admin Panel (/admin)</strong>: Password-protected (`cyberknight`) for managing store records across all 14 floors.</div>
                <div>• <strong>General Users</strong>: Search directory &amp; manage their own private purchase and sale records tied directly to their Google account.</div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAboutModal(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

