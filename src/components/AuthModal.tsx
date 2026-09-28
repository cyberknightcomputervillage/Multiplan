import React from 'react';
import { Building2, ShieldCheck, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  onSignInWithGoogle: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onSignInWithGoogle,
  isLoading,
  error,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl text-center">
        {/* Multiplan Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-5 shadow-inner">
          <Building2 className="w-8 h-8" />
        </div>

        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full">
          Multiplan Center · Dhaka
        </span>

        <h1 className="text-2xl font-bold text-white mt-3">
          Shop Directory &amp; History
        </h1>
        <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
          Please sign in with your Google account to access and manage shops, purchase records, and sales history.
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-950/50 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-neutral-800/80">
          <button
            onClick={onSignInWithGoogle}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-neutral-100 text-neutral-900 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {/* Google G Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-500 mt-4">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure Firebase Google Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
};
