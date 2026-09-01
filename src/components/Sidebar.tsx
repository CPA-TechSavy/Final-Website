import React, { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  FileText,
  CreditCard,
  MailCheck,
  TrendingUp,
  Landmark,
  X,
  Building2,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Shield,
  Trash2,
} from 'lucide-react';
import { useReceivables } from '../context/ReceivablesContext';
import { useAuth } from '../context/AuthContext';
import { ClearDataModal } from './ClearDataModal';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const {
    activeTab,
    setActiveTab,
    kpis,
    currentCompany,
    setIsCompanyModalOpen,
  } = useReceivables();

  const { currentUser, setIsAuthModalOpen, signOut } = useAuth();
  const [showClearModal, setShowClearModal] = useState(false);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'invoices',
      label: 'Billing Invoices',
      icon: FileText,
      badge: `${kpis.totalOpenInvoices}`,
    },
    {
      id: 'deposits',
      label: 'Client Receivables & Deposits',
      icon: Landmark,
      badge: 'Bank/eWallet',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 font-semibold',
    },
    {
      id: 'aging',
      label: 'Aging Matrix',
      icon: Layers,
      badge: kpis.overdueCount > 0 ? `${kpis.overdueCount}` : undefined,
      badgeColor: 'bg-red-500/20 text-red-300',
    },
    {
      id: 'customers',
      label: 'Customers & Risk',
      icon: CreditCard,
      badge: undefined,
    },
    {
      id: 'collections',
      label: 'Collections Recovery',
      icon: MailCheck,
      badge: kpis.overdueCount > 0 ? `${kpis.overdueCount} Due` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 font-semibold',
    },
    {
      id: 'cashflow',
      label: 'Cash Forecast',
      icon: TrendingUp,
      badge: undefined,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-xs">
              R
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-tight block leading-tight">
                Receivables Pro
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                Multi-Entity Ledger
              </span>
            </div>
          </div>
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="p-1 rounded text-slate-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Company Switcher Card */}
        <div className="px-3 pt-3">
          <button
            id="btn-sidebar-company-switcher"
            onClick={() => {
              setIsCompanyModalOpen(true);
              if (onMobileClose) onMobileClose();
            }}
            className="w-full text-left p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all group flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-7 h-7 rounded bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                {currentCompany.logoInitials || currentCompany.code?.slice(0, 2) || 'CO'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate leading-tight group-hover:text-blue-300 transition-colors">
                  {currentCompany.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono bg-slate-700/70 px-1 rounded text-slate-300 font-semibold">
                    {currentCompany.code}
                  </span>
                  <span>{currentCompany.currency || 'USD'}</span>
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0 ml-1" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 mt-3 overflow-y-auto">
          <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (onMobileClose) onMobileClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer min-h-[38px] ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      item.badgeColor || 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="p-3 mt-auto border-t border-slate-800 space-y-1">
          <button
            onClick={() => setShowClearModal(true)}
            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-red-400 transition-colors flex items-center justify-between text-[11px] font-medium cursor-pointer"
            title="Clear Demo Data & Start New"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear Data / Start New</span>
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex-1 text-left p-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 truncate group cursor-pointer"
              title="Manage Account"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {currentUser?.displayName?.slice(0, 1).toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs text-white font-medium leading-none truncate group-hover:text-blue-300">
                  {currentUser?.displayName || 'Finance User'}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {currentUser?.email || 'Logged In'}
                </p>
              </div>
            </button>

            <button
              onClick={() => signOut()}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <ClearDataModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
      />
    </>
  );
};
