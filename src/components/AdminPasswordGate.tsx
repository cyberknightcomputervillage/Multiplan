import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, ArrowLeft } from 'lucide-react';

interface AdminPasswordGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const ADMIN_PASSWORD = 'cyberknight';
export const USER_EDIT_PASSWORD = 'user';
const ADMIN_STORAGE_KEY = 'multiplan_admin_auth_token';

export function isLocalAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_STORAGE_KEY) === 'authenticated';
  } catch {
    return false;
  }
}

export function setLocalAdminAuthenticated(): void {
  try {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, 'authenticated');
  } catch {}
}

export function clearLocalAdminAuthenticated(): void {
  try {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
  } catch {}
}

export const AdminPasswordGate: React.FC<AdminPasswordGateProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setLocalAdminAuthenticated();
      onSuccess();
    } else {
      setError('Invalid admin password. Access denied.');
      setPassword('');
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 sm:my-12 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-7 shadow-xl">
      <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Admin Authentication</h2>
          <p className="text-xs text-neutral-400">Store Information Control Panel</p>
        </div>
      </div>

      <div className="mt-4 text-xs text-neutral-400 leading-relaxed">
        Only authorized administrators can add, update, or remove shops in the Multiplan Center database. Enter the administrator password to proceed.
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
            Admin Password
          </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                autoFocus
                required
                className="w-full pl-3.5 pr-10 py-2.5 min-h-[42px] bg-neutral-950 border border-neutral-800 rounded-xl text-white text-base sm:text-sm focus:outline-none focus:border-emerald-500 placeholder-neutral-600 touch-manipulation"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-500">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-950/60 sm:bg-transparent rounded-xl sm:rounded-none transition-colors cursor-pointer touch-manipulation"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Search</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 min-h-[42px] bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow cursor-pointer touch-manipulation"
            >
              Unlock Admin Panel
            </button>
          </div>
      </form>
    </div>
  );
};
