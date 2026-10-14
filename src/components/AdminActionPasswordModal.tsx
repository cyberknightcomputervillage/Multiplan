import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, X } from 'lucide-react';
import { ADMIN_PASSWORD, USER_EDIT_PASSWORD } from './AdminPasswordGate';

interface AdminActionPasswordModalProps {
  actionTitle: string; // e.g. "Add New Shop", "Update Shop", "Delete Shop"
  actionDescription?: string;
  allowUserEditPassword?: boolean; // if true, permitted users can type 'user' or admin can type ADMIN_PASSWORD
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminActionPasswordModal: React.FC<AdminActionPasswordModalProps> = ({
  actionTitle,
  actionDescription,
  allowUserEditPassword = false,
  onSuccess,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();
    const isValid = cleanPass === ADMIN_PASSWORD || (allowUserEditPassword && cleanPass === USER_EDIT_PASSWORD);

    if (isValid) {
      setError(null);
      onSuccess();
    } else {
      setError(allowUserEditPassword 
        ? 'Incorrect password. (For editors: enter edit password, or admin password)' 
        : 'Incorrect admin password. Action aborted.'
      );
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92dvh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-neutral-400 hover:text-white transition-colors cursor-pointer w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-800 touch-manipulation"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-3 border-b border-neutral-800 pr-10">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">Password Confirmation</h3>
            <p className="text-xs text-amber-400 font-medium truncate">{actionTitle}</p>
          </div>
        </div>

        <div className="mt-3.5 text-xs text-neutral-300 leading-relaxed">
          {actionDescription || (allowUserEditPassword 
            ? 'Enter your editor password ("user") or administrator password to authorize this change.'
            : 'Please enter your admin password to authorize this change.')}
        </div>

        {error && (
          <div className="mt-3.5 p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              {allowUserEditPassword ? 'Password (Editor / Admin) *' : 'Admin Password *'}
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                autoFocus
                required
                className="w-full pl-3.5 pr-10 py-2.5 min-h-[42px] bg-neutral-950 border border-neutral-700 rounded-xl text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 placeholder-neutral-600 touch-manipulation"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-500">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-2.5 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[42px] bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 min-h-[42px] bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer touch-manipulation"
            >
              Confirm &amp; Proceed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

