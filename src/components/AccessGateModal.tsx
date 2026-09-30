import React, { useState } from 'react';
import { 
  Building2, 
  ShieldAlert, 
  Send, 
  Clock, 
  LogOut, 
  CheckCircle2, 
  Ban, 
  RefreshCw,
  Mail,
  UserCheck
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppUser } from '../types';

interface AccessGateModalProps {
  currentUser: User;
  accessRecord: AppUser | null;
  onRequestAccess: (note: string) => Promise<void>;
  onCheckStatus: () => Promise<void>;
  onSignOut: () => void;
  onOpenAdmin: () => void;
}

export const AccessGateModal: React.FC<AccessGateModalProps> = ({
  currentUser,
  accessRecord,
  onRequestAccess,
  onCheckStatus,
  onSignOut,
  onOpenAdmin,
}) => {
  const [requestNote, setRequestNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [submittedJustNow, setSubmittedJustNow] = useState(false);

  const status = accessRecord ? accessRecord.status : 'unrequested';

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onRequestAccess(requestNote.trim());
      setSubmittedJustNow(true);
    } catch (err: any) {
      alert('Failed to send request: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsChecking(true);
      await onCheckStatus();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-md">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-7 sm:p-8 shadow-2xl relative text-center">
        {/* Multiplan Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto mb-4">
          {status === 'banned' ? (
            <Ban className="w-8 h-8 text-red-400" />
          ) : status === 'pending' || submittedJustNow ? (
            <Clock className="w-8 h-8 text-amber-400" />
          ) : (
            <Building2 className="w-8 h-8 text-emerald-400" />
          )}
        </div>

        <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
          Multiplan Center · Restricted Access
        </span>

        <h2 className="text-xl sm:text-2xl font-bold text-white mt-3">
          {status === 'banned'
            ? 'Account Access Suspended'
            : status === 'pending' || submittedJustNow
            ? 'Access Approval Pending'
            : 'Permission Required'}
        </h2>

        {/* Current User Card */}
        <div className="mt-4 p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-center gap-3 text-left">
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt=""
              className="w-10 h-10 rounded-full border border-neutral-700 object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 flex-shrink-0">
              <Mail className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs text-neutral-400 font-medium">Signed in with Google as:</div>
            <div className="text-sm font-bold text-white truncate">{currentUser.email}</div>
          </div>
        </div>

        {/* Status description */}
        {status === 'banned' ? (
          <div className="mt-5 p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-left space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              Access Denied by Administrator
            </div>
            <p className="text-xs text-red-200/90 leading-relaxed">
              This Google email (<strong>{currentUser.email}</strong>) has been restricted from viewing or using the Multiplan Center website.
            </p>
          </div>
        ) : status === 'pending' || submittedJustNow ? (
          <div className="mt-5 p-4 bg-amber-950/30 border border-amber-800/50 rounded-xl text-left space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Clock className="w-4 h-4 flex-shrink-0" />
              Waiting for Admin Approval
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Your request for <strong>{currentUser.email}</strong> has been submitted. The administrator must approve your specific email account in the Admin Panel before you can view and use the website.
            </p>
            <div className="text-[11px] text-neutral-400 pt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Once approved by admin, click &quot;Check Approval Status&quot; below.
            </div>
          </div>
        ) : (
          <div className="mt-4 text-xs text-neutral-300 text-left space-y-3">
            <p className="leading-relaxed">
              Only authorized and permitted Google accounts can view the shop directory, floor locations, and track purchases or sales.
            </p>
            <form onSubmit={handleSubmitRequest} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Optional Note for Administrator
                </label>
                <input
                  type="text"
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="e.g. Multiplan Shop Owner / Regular Buyer / Staff"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? 'Sending Request...' : 'Send Access Request to Admin'}
              </button>
            </form>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-6 pt-5 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {(status === 'pending' || submittedJustNow) && (
            <button
              onClick={handleRefresh}
              disabled={isChecking}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
              Check Approval Status
            </button>
          )}

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Open Admin Panel"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Admin Login
            </button>

            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-red-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
