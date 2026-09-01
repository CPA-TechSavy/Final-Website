import React, { useState } from 'react';
import {
  Shield,
  Building2,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  PieChart,
  DollarSign,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInAsDemoUser,
    loading: authLoading,
  } = useAuth();

  const [authMethod, setAuthMethod] = useState<'google' | 'email' | 'demo'>('google');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setUnauthorizedDomain(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        setUnauthorizedDomain(host);
        setError(`Firebase Auth: Domain '${host}' is not yet whitelisted in Firebase Console Authorized Domains.`);
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or use Instant Profile Access.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed before completing. Please try again.');
      } else {
        setError(err.message || 'Google sign-in failed. Please try again or use Instant Profile Access.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (emailMode === 'signin') {
        if (!email || !password) {
          setError('Please enter your corporate email and password.');
          setLoading(false);
          return;
        }
        await signInWithEmail(email, password);
      } else {
        if (!email || !password || !name) {
          setError('Please fill in all registration fields.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, name);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password credentials. You can also sign in with Google.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please switch to Sign In.');
      } else {
        setError(err.message || 'Authentication error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoName: string, demoEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      await signInAsDemoUser(demoName, demoEmail);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize demo session.');
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || authLoading;

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col justify-between text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top subtle branding bar */}
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md ring-1 ring-blue-400/30">
            R
          </div>
          <div>
            <span className="font-bold text-slate-100 text-sm tracking-tight">Receivables Pro</span>
            <span className="text-[11px] text-slate-400 block font-normal">Enterprise AR Ledger & Analytics</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">256-Bit SSL Encrypted Financial Portal</span>
        </div>
      </header>

      {/* Center Hero Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Value Proposition & Security Highlights */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Multi-Entity Accounts Receivable Suite</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Enterprise Billing, Aging & Cash Collection
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Sign in with your Google account to manage multi-company invoices, track real-time aging schedules, calculate expected credit losses (CECL), reconcile payment deductions, and execute AI-guided collections.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-900/60 text-blue-300 shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Multi-Entity Switching</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Apex Group, Meridian Cloud, Nexus BioHealth & Horizon</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-900/60 text-emerald-300 shrink-0 mt-0.5">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Deductions & Commissions</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Reconcile broker commissions, tax withholdings & net cash</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-900/60 text-purple-300 shrink-0 mt-0.5">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Aging Schedules & ECL</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Current, 1-30, 31-60, 61-90, 90+ days bad-debt provisions</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-900/60 text-amber-300 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">AI Collections Recovery</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Priority scoring, automated email dispatch & dispute resolution</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Google Login Box */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-slate-900">
              
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Access Your Account
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Please log in with Google to enter your enterprise workspace
                </p>
              </div>

              {/* Error / Unauthorized Domain Banner */}
              {error && (
                <div className="p-3.5 mb-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2.5 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div className="flex-1 font-medium leading-relaxed">{error}</div>
                  </div>
                  {unauthorizedDomain && (
                    <div className="bg-amber-100/70 p-2 rounded-lg text-[11px] text-amber-800 space-y-1.5 border border-amber-200">
                      <p className="font-semibold">How to whitelist for Google SSO:</p>
                      <p>
                        Add <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-mono text-[10px] select-all">{unauthorizedDomain}</code> to <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</strong>.
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('John Suarez, CPA', 'suarezjohnjoebertcpa@gmail.com')}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Instant Entry: Continue as John Suarez (CPA)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* PRIMARY ACTION: SIGN IN WITH GOOGLE */}
              <div className="space-y-3">
                <button
                  id="btn-google-login-primary"
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isBusy}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-slate-400 font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                >
                  {isBusy ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-slate-700 font-semibold">Connecting to Google...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                      <span className="group-hover:text-blue-600 transition-colors">Sign in with Google</span>
                    </>
                  )}
                </button>

                {/* Instant Access Quick Button */}
                <button
                  type="button"
                  onClick={() => handleDemoLogin('John Suarez, CPA', 'suarezjohnjoebertcpa@gmail.com')}
                  disabled={isBusy}
                  className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Direct Workspace Entry (John Suarez, CPA)</span>
                </button>

                <div className="text-center">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Instant Single Sign-On (SSO) with your Google Account
                  </span>
                </div>
              </div>

              {/* Divider for Secondary Options */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">
                    Alternative Access
                  </span>
                </div>
              </div>

              {/* Auth Method Navigation Tabs */}
              <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-50 mb-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAuthMethod('google')}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                    authMethod === 'google'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Google SSO
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                    authMethod === 'email'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Email / Pass
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('demo')}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                    authMethod === 'demo'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Demo Profiles
                </button>
              </div>

              {/* Alternate: Email / Password Form */}
              {authMethod === 'email' && (
                <form onSubmit={handleEmailSubmit} className="space-y-3 pt-1 text-xs">
                  <div className="flex justify-center gap-4 pb-2 border-b border-slate-100 mb-2">
                    <button
                      type="button"
                      onClick={() => setEmailMode('signin')}
                      className={`font-semibold pb-1 text-xs cursor-pointer ${
                        emailMode === 'signin'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailMode('signup')}
                      className={`font-semibold pb-1 text-xs cursor-pointer ${
                        emailMode === 'signup'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Register New User
                    </button>
                  </div>

                  {emailMode === 'signup' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                      <div className="relative">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Sandra Vance, CPA"
                          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-900 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Corporate Email</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="finance@enterprise.com"
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-900 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-900 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
                  >
                    <span>{emailMode === 'signin' ? 'Sign In with Email' : 'Register Account'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {/* Alternate: Demo Profiles */}
              {authMethod === 'demo' && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-slate-500 mb-2">
                    Quick test access without connecting credentials:
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('John Suarez, CPA', 'suarezjohnjoebertcpa@gmail.com')}
                    disabled={isBusy}
                    className="w-full text-left p-2.5 rounded-lg border-2 border-blue-200 bg-blue-50/40 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-blue-900 group-hover:text-blue-700 flex items-center gap-1.5">
                        <span>John Suarez, CPA — Lead Auditor & Controller</span>
                        <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.2 rounded-full font-bold">Admin</span>
                      </div>
                      <div className="text-[10px] text-slate-600">
                        suarezjohnjoebertcpa@gmail.com • Full Financial & AR Authority
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoLogin('Marcus Sterling (Controller)', 'marcus.sterling@apexgroup.com')}
                    disabled={isBusy}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                        Marcus Sterling — Corporate Controller
                      </div>
                      <div className="text-[10px] text-slate-500">
                        marcus.sterling@apexgroup.com • All Entity Access
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoLogin('Elena Rostova (VP Finance)', 'elena.rostova@meridiancloud.com')}
                    disabled={isBusy}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                        Dr. Elena Rostova — VP Finance & Treasury
                      </div>
                      <div className="text-[10px] text-slate-500">
                        elena.rostova@meridiancloud.com • Meridian Cloud Hub
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              )}

              {/* Security Badges Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>SOC2 Type II Compliant</span>
                </span>
                <span>Firebase Authentication</span>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Clean Bottom Footer */}
      <footer className="px-6 py-4 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2026 Receivables Pro. All rights reserved.</span>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>Enterprise Accounting Standards (GAAP / IFRS 9)</span>
          <span>•</span>
          <span>Google OAuth 2.0 Identity Verified</span>
        </div>
      </footer>
    </div>
  );
};
