import React from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  ShieldCheck,
  Building2,
  LogOut,
  Sparkles,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReceivables } from '../context/ReceivablesContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, currentUser, signOut, signInWithGoogle } = useAuth();
  const { currentCompany } = useReceivables();
  const [authError, setAuthError] = React.useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              {currentUser?.displayName?.slice(0, 1).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {currentUser?.displayName || 'Finance User'}
              </h3>
              <p className="text-xs text-slate-500">{currentUser?.email || 'Logged In'}</p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace details */}
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Active Entity
              </span>
              <span className="font-bold text-slate-900">{currentCompany.name}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 text-[11px]">
              <span>Currency / ISO:</span>
              <span className="font-medium text-slate-800">{currentCompany.currency}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 text-[11px]">
              <span>Security Profile:</span>
              <span className="font-medium text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Enterprise Role-Based Access
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5 text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              Google Single Sign-On authenticates and securely signs all audit logs, payment deductions, and billing PDFs generated in this session.
            </div>
          </div>

          {authError && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
              {authError}
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={async () => {
                setAuthError(null);
                try {
                  await signInWithGoogle();
                } catch (e: any) {
                  if (e.code === 'auth/unauthorized-domain' || e.message?.includes('unauthorized-domain')) {
                    const host = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
                    setAuthError(`Domain '${host}' is not yet authorized in Firebase Console.`);
                  } else {
                    setAuthError(e.message || 'Unable to switch Google account.');
                  }
                }
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>Switch Google Account</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                setIsAuthModalOpen(false);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <LogOut className="w-3.5 h-3.5 text-red-600" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
