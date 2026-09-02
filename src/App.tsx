import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Layers,
  CreditCard,
  MailCheck,
  TrendingUp,
  Landmark,
} from 'lucide-react';
import { AuthProvider, useAuth } from './Context/AuthContext';
import { ReceivablesProvider, useReceivables } from './context/ReceivablesContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ExecutiveDashboardView } from './components/ExecutiveDashboardView';
import { AgingScheduleView } from './components/AgingScheduleView';
import { InvoiceListView } from './components/InvoiceListView';
import { DepositsSettlementView } from './components/DepositsSettlementView';
import { CustomerRiskView } from './components/CustomerRiskView';
import { CashFlowForecastView } from './components/CashFlowForecastView';
import { CollectionsView } from './components/CollectionsView';
import { InvoiceModal } from './components/InvoiceModal';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { InvoiceDetailDrawer } from './components/InvoiceDetailDrawer';
import { DisputeModal } from './components/DisputeModal';
import { BillingDocumentModal } from './components/BillingDocumentModal';
import { SendBillingEmailModal } from './components/SendBillingEmailModal';
import { TopNotificationBanner } from './components/TopNotificationBanner';
import { AuthModal } from './components/AuthModal';
import { CompanySwitcherModal } from './components/CompanySwitcherModal';
import { LoginPage } from './components/LoginPage';

const AppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    kpis,
    isBillingDocumentModalOpen,
    setIsBillingDocumentModalOpen,
    selectedInvoiceForDocument,
    isSendEmailModalOpen,
    setIsSendEmailModalOpen,
    selectedInvoiceForSendEmail,
    setSelectedInvoiceForSendEmail,
  } = useReceivables();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const mobileNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Ledger', icon: FileText, badge: kpis.totalOpenInvoices },
    { id: 'deposits', label: 'Deposits', icon: Landmark },
    { id: 'aging', label: 'Aging', icon: Layers, badge: kpis.overdueCount > 0 ? kpis.overdueCount : undefined },
    { id: 'customers', label: 'Customers', icon: CreditCard },
    { id: 'collections', label: 'Recovery', icon: MailCheck },
    { id: 'cashflow', label: 'Forecast', icon: TrendingUp },
  ];

  return (
    <div className="h-screen w-full flex flex-row overflow-hidden font-sans text-slate-800 bg-slate-50 antialiased selection:bg-blue-600 selection:text-white">
      {/* Sleek Dark Left Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header onMobileMenuToggle={() => setMobileSidebarOpen(true)} />

        {/* Prominent Top Notification Banner for Email Dispatches & Internet Status */}
        <TopNotificationBanner />

        {/* Scrollable View Content */}
        <main className="p-3 sm:p-6 lg:p-8 flex-1 overflow-y-auto space-y-6 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'dashboard' && <ExecutiveDashboardView />}
            {activeTab === 'invoices' && <InvoiceListView />}
            {activeTab === 'deposits' && <DepositsSettlementView />}
            {activeTab === 'aging' && <AgingScheduleView />}
            {activeTab === 'customers' && <CustomerRiskView />}
            {activeTab === 'collections' && <CollectionsView />}
            {activeTab === 'cashflow' && <CashFlowForecastView />}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar (Phone & Small Tablet optimization) */}
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg"
        >
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[50px] ${
                  isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400 scale-110' : 'text-slate-400'}`} />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[9px] font-bold bg-red-600 text-white min-w-[14px] text-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Modals & Slide-out Drawers */}
      <AuthModal />
      <CompanySwitcherModal />
      <InvoiceModal />
      <RecordPaymentModal />
      <InvoiceDetailDrawer />
      <DisputeModal />
      <BillingDocumentModal
        isOpen={isBillingDocumentModalOpen}
        onClose={() => setIsBillingDocumentModalOpen(false)}
        invoice={selectedInvoiceForDocument}
        onOpenSendEmail={(inv) => {
          setSelectedInvoiceForSendEmail(inv);
          setIsSendEmailModalOpen(true);
        }}
      />
      <SendBillingEmailModal
        isOpen={isSendEmailModalOpen}
        onClose={() => setIsSendEmailModalOpen(false)}
        invoice={selectedInvoiceForSendEmail}
      />
    </div>
  );
};

const AuthGate: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-blue-500/20 animate-pulse">
          R
        </div>
        <div className="flex items-center gap-2.5 text-slate-300 text-sm font-medium">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>Verifying authentication session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <ReceivablesProvider>
      <AppContent />
    </ReceivablesProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

