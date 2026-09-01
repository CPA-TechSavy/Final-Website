import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Customer,
  Invoice,
  Payment,
  AgingBucketSummary,
  KPISummary,
  CashFlowInflowProjection,
  Company,
  FilterState,
  InvoiceStatus,
  EmailDispatchLog,
  ReminderLog,
  AppNotification,
} from '../types';
import { INITIAL_COMPANIES, INITIAL_CUSTOMERS, INITIAL_INVOICES, INITIAL_PAYMENTS, getCompanyInitialData } from '../data/mockData';
import { useAuth } from './AuthContext';
import { dispatchCustomerBillingEmail } from '../utils/network';
import { formatCurrency } from '../utils/currency';

export type TabType = 'dashboard' | 'invoices' | 'deposits' | 'aging' | 'customers' | 'collections' | 'cashflow';

export interface LossRatesConfig {
  'Current (0-30)': number;
  '31-60 Days': number;
  '61-90 Days': number;
  '91-120 Days': number;
  '120+ Days': number;
}

interface ReceivablesContextType {
  // Navigation & Entity
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  companies: Company[];
  activeCompanyId: string;
  currentCompany: Company;
  switchCompany: (companyId: string) => void;
  createCompany: (company: Omit<Company, 'id' | 'createdAt'>) => Company;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;

  // Master Data
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  asOfDate: string;
  setAsOfDate: (date: string) => void;

  // Computed Summaries
  kpis: KPISummary;
  agingBuckets: AgingBucketSummary[];
  cashFlowProjections: CashFlowInflowProjection[];
  openInvoices: Invoice[];
  overdueInvoices: Invoice[];
  openInvoicesCount: number;
  overdueCount: number;

  // Loss Rate Configuration (Aging Matrix)
  lossRates: LossRatesConfig;
  updateLossRate: (bucket: keyof LossRatesConfig, rate: number) => void;
  resetLossRates: () => void;

  // Cash Flow Forecast Clearing & Encoding
  isForecastCleared: boolean;
  clearCashForecast: () => void;
  restoreCashForecast: () => void;
  updateForecastPeriod: (periodKey: string, values: { expectedAmount: number; optimisticAmount: number; conservativeAmount: number }) => void;

  // Filtering
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filteredInvoices: Invoice[];
  resetFilters: () => void;

  // Invoice Actions
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'reminders' | 'balance' | 'status'> & { status?: InvoiceStatus }) => string;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  updateInvoiceDepositStatus: (id: string, depositUpdates: { depositStatus?: string; depositChannel?: string; depositDate?: string; depositReference?: string; depositNotes?: string }) => void;
  deleteInvoice: (id: string) => void;
  generateNextBillingNumber: (prefix?: string) => string;

  // Payment Actions
  recordPayment: (payment: Omit<Payment, 'id' | 'recordedAt'>) => string;
  deletePayment: (id: string) => void;

  // Customer Actions
  addCustomer: (customer: Omit<Customer, 'id'>) => string;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Communication & Reminders
  logReminder: (invoiceId: string, reminder: Omit<ReminderLog, 'id' | 'date'>) => void;
  sendBillingEmail: (invoiceId: string, emailData: {
    recipientEmail: string;
    recipientName: string;
    subject: string;
    message: string;
    attachPdf: boolean;
  }) => Promise<{ success: boolean; isNetworkError?: boolean; error?: string; messageId?: string }>;
  recordDispute: (invoiceId: string, disputeData: { reason: string; notes?: string }) => void;
  resolveDispute: (invoiceId: string, resolutionNotes: string) => void;

  // System Notifications & Network Connectivity
  notification: AppNotification | null;
  setNotification: (notif: AppNotification | null) => void;
  showNotification: (notif: Omit<AppNotification, 'id' | 'timestamp'>) => void;
  dismissNotification: () => void;
  isOnline: boolean;

  // Modals & Drawers Control
  isInvoiceModalOpen: boolean;
  setIsInvoiceModalOpen: (open: boolean) => void;
  editingInvoice: Invoice | null;
  setEditingInvoice: (inv: Invoice | null) => void;
  openCreateInvoiceModal: () => void;
  openEditInvoiceModal: (inv: Invoice) => void;

  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (open: boolean) => void;
  selectedInvoiceForPayment: Invoice | null;
  setSelectedInvoiceForPayment: (inv: Invoice | null) => void;
  openPaymentModalForInvoice: (inv: Invoice) => void;

  isDetailDrawerOpen: boolean;
  setIsDetailDrawerOpen: (open: boolean) => void;
  selectedInvoice: Invoice | null;
  setSelectedInvoice: (inv: Invoice | null) => void;
  openInvoiceDetail: (inv: Invoice) => void;

  isCompanyModalOpen: boolean;
  setIsCompanyModalOpen: (open: boolean) => void;

  isBillingDocumentModalOpen: boolean;
  setIsBillingDocumentModalOpen: (open: boolean) => void;
  selectedInvoiceForDocument: Invoice | null;
  setSelectedInvoiceForDocument: (inv: Invoice | null) => void;
  openBillingDocumentModal: (inv: Invoice) => void;

  isSendEmailModalOpen: boolean;
  setIsSendEmailModalOpen: (open: boolean) => void;
  selectedInvoiceForSendEmail: Invoice | null;
  setSelectedInvoiceForSendEmail: (inv: Invoice | null) => void;
  openSendEmailModal: (inv: Invoice) => void;

  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;

  isDisputeModalOpen: boolean;
  setIsDisputeModalOpen: (open: boolean) => void;
  selectedInvoiceForDispute: Invoice | null;
  setSelectedInvoiceForDispute: (inv: Invoice | null) => void;
  openDisputeModal: (inv: Invoice) => void;

  // Reset/Clear Data
  resetToSampleData: () => void;
  clearAllData: () => void;
}

const defaultFilters: FilterState = {
  search: '',
  status: 'all',
  agingBucket: 'all',
  riskRating: 'all',
  customerId: 'all',
  dateFrom: '',
  dateTo: '',
  sortBy: 'dueDate',
  sortOrder: 'asc',
};

const ReceivablesContext = createContext<ReceivablesContextType | undefined>(undefined);

export const ReceivablesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Navigation & Company state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [asOfDate, setAsOfDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('arm_companies');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_COMPANIES;
  });

  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    return localStorage.getItem('arm_active_company_id') || 'comp-apex';
  });

  const currentCompany = useMemo(() => {
    return companies.find((c) => c.id === activeCompanyId) || companies[0] || INITIAL_COMPANIES[0];
  }, [companies, activeCompanyId]);

  // Master Data per active company
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(`arm_customers_${activeCompanyId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return getCompanyInitialData(activeCompanyId).customers;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(`arm_invoices_${activeCompanyId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return getCompanyInitialData(activeCompanyId).invoices;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem(`arm_payments_${activeCompanyId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return getCompanyInitialData(activeCompanyId).payments;
  });

  // Modal and drawer visibility states
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  const [isBillingDocumentModalOpen, setIsBillingDocumentModalOpen] = useState(false);
  const [selectedInvoiceForDocument, setSelectedInvoiceForDocument] = useState<Invoice | null>(null);

  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [selectedInvoiceForSendEmail, setSelectedInvoiceForSendEmail] = useState<Invoice | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [selectedInvoiceForDispute, setSelectedInvoiceForDispute] = useState<Invoice | null>(null);

  // System Notifications & Network Connectivity
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        isNetworkError: true,
        title: 'Network Connection Lost',
        message: 'You are currently offline. Outgoing billing email dispatches require an active internet connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp'>) => {
    setNotification({
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  // Aging Matrix Loss Rate Configuration
  const [lossRates, setLossRates] = useState<LossRatesConfig>(() => {
    const saved = localStorage.getItem(`arm_loss_rates_${activeCompanyId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      'Current (0-30)': 0.01,
      '31-60 Days': 0.05,
      '61-90 Days': 0.15,
      '91-120 Days': 0.35,
      '120+ Days': 0.75,
    };
  });

  const updateLossRate = useCallback((bucket: keyof LossRatesConfig, rate: number) => {
    setLossRates((prev) => {
      const updated = { ...prev, [bucket]: Math.max(0, Math.min(1, rate)) };
      localStorage.setItem(`arm_loss_rates_${activeCompanyId}`, JSON.stringify(updated));
      return updated;
    });
  }, [activeCompanyId]);

  const resetLossRates = useCallback(() => {
    const defaults: LossRatesConfig = {
      'Current (0-30)': 0.01,
      '31-60 Days': 0.05,
      '61-90 Days': 0.15,
      '91-120 Days': 0.35,
      '120+ Days': 0.75,
    };
    setLossRates(defaults);
    localStorage.removeItem(`arm_loss_rates_${activeCompanyId}`);
  }, [activeCompanyId]);

  // Cash Flow Forecast Clearing & Custom Overrides
  const [isForecastCleared, setIsForecastCleared] = useState<boolean>(() => {
    return localStorage.getItem(`arm_forecast_cleared_${activeCompanyId}`) === 'true';
  });

  const [customForecastOverrides, setCustomForecastOverrides] = useState<Record<string, { expectedAmount: number; optimisticAmount: number; conservativeAmount: number }>>(() => {
    const saved = localStorage.getItem(`arm_forecast_overrides_${activeCompanyId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  const clearCashForecast = useCallback(() => {
    setIsForecastCleared(true);
    setCustomForecastOverrides({});
    localStorage.setItem(`arm_forecast_cleared_${activeCompanyId}`, 'true');
    localStorage.removeItem(`arm_forecast_overrides_${activeCompanyId}`);
  }, [activeCompanyId]);

  const restoreCashForecast = useCallback(() => {
    setIsForecastCleared(false);
    setCustomForecastOverrides({});
    localStorage.removeItem(`arm_forecast_cleared_${activeCompanyId}`);
    localStorage.removeItem(`arm_forecast_overrides_${activeCompanyId}`);
  }, [activeCompanyId]);

  const updateForecastPeriod = useCallback((periodKey: string, values: { expectedAmount: number; optimisticAmount: number; conservativeAmount: number }) => {
    setCustomForecastOverrides((prev) => {
      const next = { ...prev, [periodKey]: values };
      localStorage.setItem(`arm_forecast_overrides_${activeCompanyId}`, JSON.stringify(next));
      return next;
    });
    setIsForecastCleared(false);
  }, [activeCompanyId]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('arm_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('arm_active_company_id', activeCompanyId);
  }, [activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`arm_customers_${activeCompanyId}`, JSON.stringify(customers));
  }, [customers, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`arm_invoices_${activeCompanyId}`, JSON.stringify(invoices));
  }, [invoices, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`arm_payments_${activeCompanyId}`, JSON.stringify(payments));
  }, [payments, activeCompanyId]);

  // Switch entity handler
  const switchCompany = useCallback((companyId: string) => {
    setActiveCompanyId(companyId);
    // load data for company
    const savedCust = localStorage.getItem(`arm_customers_${companyId}`);
    const savedInvs = localStorage.getItem(`arm_invoices_${companyId}`);
    const savedPmts = localStorage.getItem(`arm_payments_${companyId}`);

    if (savedCust && savedInvs) {
      try {
        setCustomers(JSON.parse(savedCust));
        setInvoices(JSON.parse(savedInvs));
        setPayments(savedPmts ? JSON.parse(savedPmts) : []);
        return;
      } catch {}
    }

    const sample = getCompanyInitialData(companyId);
    setCustomers(sample.customers);
    setInvoices(sample.invoices);
    setPayments(sample.payments);
  }, []);

  const createCompany = useCallback((companyData: Omit<Company, 'id' | 'createdAt'>) => {
    const id = `comp-${Date.now()}`;
    const newComp: Company = {
      ...companyData,
      id,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser?.email || 'Admin',
    };
    setCompanies((prev) => [...prev, newComp]);
    switchCompany(id);
    return newComp;
  }, [currentUser, switchCompany]);

  const updateCompany = useCallback((id: string, updates: Partial<Company>) => {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCompany = useCallback((id: string) => {
    // 1. Remove company-specific data from localStorage
    try {
      localStorage.removeItem(`arm_customers_${id}`);
      localStorage.removeItem(`arm_invoices_${id}`);
      localStorage.removeItem(`arm_payments_${id}`);
    } catch {}

    // 2. Filter companies list
    setCompanies((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      const finalCompanies = filtered.length > 0 ? filtered : INITIAL_COMPANIES;
      
      // If we are deleting the currently active company, switch to another valid company
      if (activeCompanyId === id) {
        const nextId = finalCompanies[0].id;
        // switchCompany loads the corresponding customers/invoices/payments and updates activeCompanyId
        setTimeout(() => {
          switchCompany(nextId);
        }, 0);
      }
      return finalCompanies;
    });
  }, [activeCompanyId, switchCompany]);

  // Calculate dynamic invoice aging and status
  const processedInvoices = useMemo(() => {
    const asOf = new Date(asOfDate).getTime();
    return invoices.map((inv) => {
      const dueTime = new Date(inv.dueDate).getTime();
      const diffDays = Math.floor((asOf - dueTime) / (1000 * 60 * 60 * 24));
      const overdueDays = diffDays > 0 ? diffDays : 0;

      let status: InvoiceStatus = inv.status;
      if (inv.balance <= 0) {
        status = 'paid';
      } else if (inv.paidAmount > 0) {
        status = 'partially_paid';
      } else if (overdueDays > 0 && status !== 'disputed' && status !== 'written_off') {
        status = 'overdue';
      }

      let bucket: AgingBucketSummary['bucket'] = 'Current (0-30)';
      if (overdueDays <= 0) {
        bucket = 'Current (0-30)';
      } else if (overdueDays <= 30) {
        bucket = 'Current (0-30)';
      } else if (overdueDays <= 60) {
        bucket = '31-60 Days';
      } else if (overdueDays <= 90) {
        bucket = '61-90 Days';
      } else if (overdueDays <= 120) {
        bucket = '91-120 Days';
      } else {
        bucket = '120+ Days';
      }

      return {
        ...inv,
        status,
        overdueDays,
        agingBucket: bucket,
      };
    });
  }, [invoices, asOfDate]);

  // Dynamic customer stats
  const processedCustomers = useMemo(() => {
    return customers.map((c) => {
      const custInvoices = processedInvoices.filter((i) => i.customerId === c.id);
      const totalBilled = custInvoices.reduce((s, i) => s + i.amount, 0);
      const totalPaid = custInvoices.reduce((s, i) => s + i.paidAmount, 0);
      const totalOutstanding = custInvoices.reduce((s, i) => s + i.balance, 0);
      const openInvoices = custInvoices.filter((i) => i.balance > 0);
      const overdueInvs = custInvoices.filter((i) => i.balance > 0 && (i.overdueDays || 0) > 0);
      const maxOverdue = overdueInvs.reduce((max, i) => Math.max(max, i.overdueDays || 0), 0);
      const utilization = c.creditLimit > 0 ? Math.round((totalOutstanding / c.creditLimit) * 100) : 0;

      return {
        ...c,
        totalBilled,
        totalPaid,
        totalOutstanding,
        openInvoiceCount: openInvoices.length,
        overdueInvoiceCount: overdueInvs.length,
        oldestOverdueDays: maxOverdue,
        creditUtilization: utilization,
      };
    });
  }, [customers, processedInvoices]);

  const openInvoices = useMemo(() => {
    return processedInvoices.filter((inv) => inv.balance > 0 && inv.status !== 'written_off');
  }, [processedInvoices]);

  const overdueInvoices = useMemo(() => {
    return processedInvoices.filter((inv) => inv.balance > 0 && (inv.overdueDays || 0) > 0 && inv.status !== 'written_off');
  }, [processedInvoices]);

  // Aging Bucket Summary Calculation
  const agingBuckets = useMemo<AgingBucketSummary[]>(() => {
    const bucketsConfig = [
      { bucket: 'Current (0-30)' as const, label: 'Current / 0-30 Days', minDays: 0, maxDays: 30, color: '#3B82F6' },
      { bucket: '31-60 Days' as const, label: '31-60 Days Overdue', minDays: 31, maxDays: 60, color: '#F59E0B' },
      { bucket: '61-90 Days' as const, label: '61-90 Days Overdue', minDays: 61, maxDays: 90, color: '#F97316' },
      { bucket: '91-120 Days' as const, label: '91-120 Days Overdue', minDays: 91, maxDays: 120, color: '#EF4444' },
      { bucket: '120+ Days' as const, label: '120+ Days Delinquent', minDays: 121, maxDays: 9999, color: '#991B1B' },
    ];

    const totalOpenAmount = openInvoices.reduce((sum, i) => sum + i.balance, 0) || 1;

    return bucketsConfig.map((cfg) => {
      const bucketInvoices = openInvoices.filter((i) => i.agingBucket === cfg.bucket);
      const amount = bucketInvoices.reduce((s, i) => s + i.balance, 0);
      const count = bucketInvoices.length;
      const percentage = Math.round((amount / totalOpenAmount) * 1000) / 10;
      const rate = lossRates[cfg.bucket] !== undefined ? lossRates[cfg.bucket] : 0.05;
      const badDebtReserve = Math.round(amount * rate * 100) / 100;

      return {
        bucket: cfg.bucket,
        label: cfg.label,
        minDays: cfg.minDays,
        maxDays: cfg.maxDays,
        amount,
        count,
        percentage,
        expectedLossRate: rate,
        badDebtReserve,
        color: cfg.color,
      };
    });
  }, [openInvoices, lossRates]);

  // Overall KPIs
  const kpis = useMemo<KPISummary>(() => {
    const totalReceivables = openInvoices.reduce((s, i) => s + i.balance, 0);
    const totalOpenInvoices = openInvoices.length;
    const totalOverdue = overdueInvoices.reduce((s, i) => s + i.balance, 0);
    const overduePercentage = totalReceivables > 0 ? Math.round((totalOverdue / totalReceivables) * 1000) / 10 : 0;
    const overdueCount = overdueInvoices.length;

    const currentBucket = agingBuckets.find((b) => b.bucket === 'Current (0-30)');
    const currentAmount = currentBucket?.amount || 0;
    const currentPercentage = currentBucket?.percentage || 0;

    // Bad debt reserve total
    const badDebtReserve = agingBuckets.reduce((s, b) => s + b.badDebtReserve, 0);

    // Filter MTD payments
    const thirtyDaysAgo = new Date(new Date(asOfDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const mtdPayments = payments.filter((p) => p.paymentDate >= thirtyDaysAgo && p.paymentDate <= asOfDate);

    const collectedThisMonth = mtdPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const deductionsThisMonth = mtdPayments.reduce((s, p) => s + (p.totalDeductions || (p.deductions?.reduce((ds, d) => ds + d.amount, 0) || 0)), 0);
    const netCollectedThisMonth = Math.max(0, collectedThisMonth - deductionsThisMonth);

    const totalDeductionsAllTime = payments.reduce((s, p) => s + (p.totalDeductions || 0), 0);

    // Remittance & Receiving Channel Breakdown
    let totalRemittedToBank = 0;
    let totalReceivedViaEWallet = 0;
    let totalCashOrOther = 0;
    let bankCollectionsCount = 0;
    let eWalletCollectionsCount = 0;

    payments.forEach((p) => {
      const net = p.netCollectedAmount !== undefined ? p.netCollectedAmount : p.amount;
      const isBank =
        p.collectionDestination === 'bank_remittance' ||
        p.paymentMethod === 'Bank Transfer' ||
        p.paymentMethod === 'Wire Transfer' ||
        p.paymentMethod === 'ACH' ||
        (p.destinationAccountName && p.destinationAccountName.toLowerCase().includes('bank'));

      const isEWallet =
        p.collectionDestination === 'ewallet_received' ||
        p.paymentMethod === 'eWALLETS' ||
        (p.destinationAccountName && (
          p.destinationAccountName.toLowerCase().includes('gcash') ||
          p.destinationAccountName.toLowerCase().includes('maya') ||
          p.destinationAccountName.toLowerCase().includes('wallet') ||
          p.destinationAccountName.toLowerCase().includes('paypal') ||
          p.destinationAccountName.toLowerCase().includes('wise')
        ));

      if (isBank) {
        totalRemittedToBank += net;
        bankCollectionsCount += 1;
      } else if (isEWallet) {
        totalReceivedViaEWallet += net;
        eWalletCollectionsCount += 1;
      } else {
        totalCashOrOther += net;
      }
    });

    // CEI & DSO calculation
    const totalBilledPast90Days = processedInvoices.reduce((s, i) => s + i.amount, 0);
    const dailyCreditSales = totalBilledPast90Days > 0 ? totalBilledPast90Days / 90 : 5000;
    const dsoDays = Math.round((totalReceivables / (dailyCreditSales || 1)) * 10) / 10 || 32;

    const possibleCollections = totalReceivables + collectedThisMonth;
    const ceiPercentage = possibleCollections > 0 ? Math.min(100, Math.round((collectedThisMonth / possibleCollections) * 100)) : 88;

    const disputedInvoices = processedInvoices.filter((i) => i.disputeStatus === 'open' || i.status === 'disputed');
    const disputedAmount = disputedInvoices.reduce((s, i) => s + i.balance, 0);

    const averageInvoiceSize = processedInvoices.length > 0 ? Math.round(processedInvoices.reduce((s, i) => s + i.amount, 0) / processedInvoices.length) : 0;

    return {
      totalReceivables,
      totalOpenInvoices,
      totalOverdue,
      overduePercentage,
      overdueCount,
      currentAmount,
      currentPercentage,
      dsoDays,
      dsoTarget: currentCompany.dsoTarget || 35,
      ceiPercentage: ceiPercentage || 85,
      averageDaysToPay: 27,
      disputedAmount,
      disputedCount: disputedInvoices.length,
      badDebtReserve,
      collectedThisMonth,
      deductionsThisMonth,
      netCollectedThisMonth,
      totalDeductionsAllTime,
      averageInvoiceSize,
      totalRemittedToBank,
      totalReceivedViaEWallet,
      totalCashOrOther,
      bankCollectionsCount,
      eWalletCollectionsCount,
    };
  }, [openInvoices, overdueInvoices, agingBuckets, payments, asOfDate, processedInvoices, currentCompany]);

  // Cash Flow Inflow Projections
  const cashFlowProjections = useMemo<CashFlowInflowProjection[]>(() => {
    const periods = [
      { key: 'Week 1 (Days 1-7)', daysMin: 0, daysMax: 7, conf: 0.95 },
      { key: 'Week 2 (Days 8-14)', daysMin: 8, daysMax: 14, conf: 0.9 },
      { key: 'Week 3 (Days 15-21)', daysMin: 15, daysMax: 21, conf: 0.85 },
      { key: 'Week 4 (Days 22-30)', daysMin: 22, daysMax: 30, conf: 0.75 },
      { key: 'Month 2 (Days 31-60)', daysMin: 31, daysMax: 60, conf: 0.65 },
      { key: 'Month 3 (Days 61-90)', daysMin: 61, daysMax: 90, conf: 0.45 },
    ];

    if (isForecastCleared) {
      return periods.map((p) => {
        const override = customForecastOverrides[p.key];
        return {
          period: p.key,
          expectedAmount: override ? override.expectedAmount : 0,
          optimisticAmount: override ? override.optimisticAmount : 0,
          conservativeAmount: override ? override.conservativeAmount : 0,
          invoicesDueCount: 0,
        };
      });
    }

    const asOfTime = new Date(asOfDate).getTime();

    return periods.map((p) => {
      const override = customForecastOverrides[p.key];
      if (override) {
        return {
          period: p.key,
          expectedAmount: override.expectedAmount,
          optimisticAmount: override.optimisticAmount,
          conservativeAmount: override.conservativeAmount,
          invoicesDueCount: 1,
        };
      }

      const matching = openInvoices.filter((inv) => {
        const dueTime = new Date(inv.dueDate).getTime();
        const daysFromNow = Math.floor((dueTime - asOfTime) / (1000 * 60 * 60 * 24));
        return daysFromNow >= p.daysMin && daysFromNow <= p.daysMax;
      });

      const rawAmount = matching.reduce((s, i) => s + i.balance, 0);
      const expectedAmount = Math.round(rawAmount * p.conf);
      const optimisticAmount = Math.round(rawAmount * Math.min(1, p.conf * 1.15));
      const conservativeAmount = Math.round(rawAmount * (p.conf * 0.8));

      return {
        period: p.key,
        expectedAmount: expectedAmount || (p.daysMin < 30 ? 25000 + p.daysMin * 1200 : 15000),
        optimisticAmount: optimisticAmount || (p.daysMin < 30 ? 32000 + p.daysMin * 1500 : 22000),
        conservativeAmount: conservativeAmount || (p.daysMin < 30 ? 18000 + p.daysMin * 800 : 10000),
        invoicesDueCount: matching.length || 2,
      };
    });
  }, [openInvoices, asOfDate, isForecastCleared, customForecastOverrides]);

  // Filtered invoices list
  const filteredInvoices = useMemo(() => {
    return processedInvoices.filter((inv) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchCust = inv.customerName.toLowerCase().includes(q);
        const matchPo = inv.poNumber?.toLowerCase().includes(q);
        if (!matchNum && !matchCust && !matchPo) return false;
      }
      if (filters.status !== 'all' && inv.status !== filters.status) return false;
      if (filters.agingBucket !== 'all' && inv.agingBucket !== filters.agingBucket) return false;
      if (filters.customerId !== 'all' && inv.customerId !== filters.customerId) return false;
      if (filters.dateFrom && inv.issueDate < filters.dateFrom) return false;
      if (filters.dateTo && inv.issueDate > filters.dateTo) return false;
      return true;
    }).sort((a, b) => {
      const mult = filters.sortOrder === 'asc' ? 1 : -1;
      if (filters.sortBy === 'dueDate') return mult * a.dueDate.localeCompare(b.dueDate);
      if (filters.sortBy === 'issueDate') return mult * a.issueDate.localeCompare(b.issueDate);
      if (filters.sortBy === 'amount') return mult * (a.amount - b.amount);
      if (filters.sortBy === 'balance') return mult * (a.balance - b.balance);
      if (filters.sortBy === 'overdueDays') return mult * ((a.overdueDays || 0) - (b.overdueDays || 0));
      return mult * a.customerName.localeCompare(b.customerName);
    });
  }, [processedInvoices, filters]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Invoice CRUD
  const generateNextBillingNumber = useCallback((prefix = 'INV') => {
    const existingNums = processedInvoices.map((i) => i.invoiceNumber);
    const year = new Date().getFullYear();
    let seq = processedInvoices.length + 1;
    let candidate = `${currentCompany.code || prefix}-${year}-${String(seq).padStart(3, '0')}`;
    while (existingNums.includes(candidate)) {
      seq += 1;
      candidate = `${currentCompany.code || prefix}-${year}-${String(seq).padStart(3, '0')}`;
    }
    return candidate;
  }, [processedInvoices, currentCompany]);

  const addInvoice = useCallback((invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'reminders' | 'balance' | 'status'> & { status?: InvoiceStatus }) => {
    const id = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newInvoice: Invoice = {
      ...invoiceData,
      id,
      balance: Math.max(0, invoiceData.amount - (invoiceData.paidAmount || 0)),
      status: invoiceData.status || (invoiceData.paidAmount >= invoiceData.amount ? 'paid' : 'sent'),
      reminders: [],
      emailDispatches: invoiceData.autoEmailSent ? [
        {
          id: `eml-${Date.now()}`,
          sentAt: new Date().toISOString(),
          recipientEmail: invoiceData.customerEmail,
          recipientName: invoiceData.customerName,
          subject: `Invoice ${invoiceData.invoiceNumber} from ${currentCompany.name}`,
          senderName: currentUser?.displayName || 'Billing Dept',
          status: 'sent',
          triggerType: 'auto_on_create',
          pdfAttached: true,
          notes: 'Auto-dispatched upon billing creation.',
        },
      ] : [],
      createdAt: new Date().toISOString(),
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    return id;
  }, [currentCompany, currentUser]);

  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        const merged = { ...inv, ...updates };
        if (updates.amount !== undefined || updates.paidAmount !== undefined) {
          merged.balance = Math.max(0, (merged.amount || 0) - (merged.paidAmount || 0));
          if (merged.balance === 0) {
            merged.status = 'paid';
          }
        }
        return merged;
      })
    );
  }, []);

  const updateInvoiceDepositStatus = useCallback((id: string, depositUpdates: { depositStatus?: string; depositChannel?: string; depositDate?: string; depositReference?: string; depositNotes?: string }) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        return {
          ...inv,
          depositStatus: (depositUpdates.depositStatus as any) || inv.depositStatus || 'pending_deposit',
          depositChannel: depositUpdates.depositChannel !== undefined ? depositUpdates.depositChannel : inv.depositChannel,
          depositDate: depositUpdates.depositDate !== undefined ? depositUpdates.depositDate : inv.depositDate,
          depositReference: depositUpdates.depositReference !== undefined ? depositUpdates.depositReference : inv.depositReference,
          depositNotes: depositUpdates.depositNotes !== undefined ? depositUpdates.depositNotes : inv.depositNotes,
        };
      })
    );
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    setPayments((prev) => prev.filter((p) => p.invoiceId !== id));
    if (selectedInvoice?.id === id) {
      setSelectedInvoice(null);
      setIsDetailDrawerOpen(false);
    }
  }, [selectedInvoice]);

  // Payment Recording
  const recordPayment = useCallback((paymentData: Omit<Payment, 'id' | 'recordedAt'>) => {
    const id = `pmt-${Date.now()}`;
    const newPayment: Payment = {
      ...paymentData,
      id,
      recordedAt: new Date().toISOString(),
    };

    setPayments((prev) => [newPayment, ...prev]);

    // Update the invoice paidAmount and balance
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== paymentData.invoiceId) return inv;
        const newPaid = inv.paidAmount + paymentData.amount;
        const newBalance = Math.max(0, inv.amount - newPaid);
        const newStatus: InvoiceStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
        return {
          ...inv,
          paidAmount: newPaid,
          balance: newBalance,
          status: newStatus,
        };
      })
    );

    return id;
  }, []);

  const deletePayment = useCallback((id: string) => {
    const pmt = payments.find((p) => p.id === id);
    if (!pmt) return;
    setPayments((prev) => prev.filter((p) => p.id !== id));

    // Revert on invoice
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== pmt.invoiceId) return inv;
        const newPaid = Math.max(0, inv.paidAmount - pmt.amount);
        const newBalance = inv.amount - newPaid;
        return {
          ...inv,
          paidAmount: newPaid,
          balance: newBalance,
          status: newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'sent',
        };
      })
    );
  }, [payments]);

  // Customer Actions
  const addCustomer = useCallback((customerData: Omit<Customer, 'id'>) => {
    const id = `cust-${Date.now()}`;
    const newCust: Customer = { ...customerData, id };
    setCustomers((prev) => [...prev, newCust]);
    return id;
  }, []);

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setInvoices((prevInvoices) => {
      const remainingInvoices = prevInvoices.filter((inv) => inv.customerId !== id);
      const removedInvoiceIds = new Set(
        prevInvoices.filter((inv) => inv.customerId === id).map((inv) => inv.id)
      );
      if (removedInvoiceIds.size > 0) {
        setPayments((prevPayments) =>
          prevPayments.filter((pmt) => !removedInvoiceIds.has(pmt.invoiceId))
        );
      }
      return remainingInvoices;
    });
  }, []);

  // Reminders & Email Logging
  const logReminder = useCallback((invoiceId: string, reminder: Omit<ReminderLog, 'id' | 'date'>) => {
    const remId = `rem-${Date.now()}`;
    const date = new Date().toISOString().split('T')[0];
    const newRem: ReminderLog = { ...reminder, id: remId, date };

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          reminders: [...(inv.reminders || []), newRem],
          lastReminderDate: date,
        };
      })
    );
  }, []);

  const sendBillingEmail = useCallback(async (invoiceId: string, emailData: {
    recipientEmail: string;
    recipientName: string;
    subject: string;
    message: string;
    attachPdf: boolean;
  }) => {
    const targetInvoice = invoices.find((i) => i.id === invoiceId);
    const targetCustomer = customers.find((c) => c.id === targetInvoice?.customerId);

    // Show transmitting notification banner above
    showNotification({
      type: 'sending',
      title: 'Transmitting Data',
      message: `Sending billing statement ${targetInvoice?.invoiceNumber || ''} to ${emailData.recipientEmail}...`,
      recipientEmail: emailData.recipientEmail,
      recipientName: emailData.recipientName,
      invoiceNumber: targetInvoice?.invoiceNumber,
    });

    const result = await dispatchCustomerBillingEmail({
      invoiceId,
      invoiceNumber: targetInvoice?.invoiceNumber || 'INV-STATEMENT',
      recipientEmail: emailData.recipientEmail,
      recipientName: emailData.recipientName,
      subject: emailData.subject,
      message: emailData.message,
      attachPdf: emailData.attachPdf,
      customerData: {
        name: targetCustomer?.name || targetInvoice?.customerName || emailData.recipientName,
        code: targetCustomer?.code,
        email: emailData.recipientEmail,
        contactName: targetCustomer?.contactName || emailData.recipientName,
        phone: targetCustomer?.phone,
        address: targetCustomer?.address,
      },
      invoiceData: targetInvoice ? {
        issueDate: targetInvoice.issueDate,
        dueDate: targetInvoice.dueDate,
        totalAmount: targetInvoice.amount,
        paidAmount: targetInvoice.paidAmount,
        balanceDue: targetInvoice.balance,
        paymentTerms: targetInvoice.paymentTerms,
        poNumber: targetInvoice.poNumber,
        itemsCount: targetInvoice.items?.length || 0,
      } : undefined,
      companyData: {
        name: currentCompany.name,
        currency: currentCompany.currency,
        bankName: currentCompany.bankInfo?.bankName,
        accountNumber: currentCompany.bankInfo?.accountNumber,
        eWalletType: currentCompany.eWalletInfo?.walletType,
        eWalletNumber: currentCompany.eWalletInfo?.accountNumber,
      },
    });

    if (!result.success) {
      if (result.isNetworkError) {
        showNotification({
          type: 'error',
          isNetworkError: true,
          title: 'Internet Connection Problem',
          message: `Unable to dispatch billing data to ${emailData.recipientEmail}. Please check your network connection and retry.`,
          recipientEmail: emailData.recipientEmail,
          recipientName: emailData.recipientName,
          invoiceNumber: targetInvoice?.invoiceNumber,
          retryAction: () => sendBillingEmail(invoiceId, emailData),
        });
      } else {
        showNotification({
          type: 'error',
          isNetworkError: false,
          title: 'Email Delivery Error',
          message: result.error || 'Failed to dispatch email data.',
          recipientEmail: emailData.recipientEmail,
          recipientName: emailData.recipientName,
          invoiceNumber: targetInvoice?.invoiceNumber,
        });
      }
      return { success: false, isNetworkError: result.isNetworkError, error: result.error };
    }

    const logId = result.messageId || `eml-${Date.now()}`;
    const newLog: EmailDispatchLog = {
      id: logId,
      sentAt: result.sentAt || new Date().toISOString(),
      recipientEmail: emailData.recipientEmail,
      recipientName: emailData.recipientName,
      subject: emailData.subject,
      senderName: currentUser?.displayName || 'Finance Department',
      status: 'delivered',
      triggerType: 'manual_dispatch',
      pdfAttached: emailData.attachPdf,
      notes: emailData.message.slice(0, 100),
    };

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          status: inv.status === 'draft' ? 'sent' : inv.status,
          emailDispatches: [...(inv.emailDispatches || []), newLog],
          lastEmailedAt: newLog.sentAt,
        };
      })
    );

    // Show prominent success notification above
    showNotification({
      type: 'success',
      title: 'Email Dispatched Successfully',
      message: `Billing statement and invoice data for ${targetInvoice?.invoiceNumber || 'Invoice'} (${formatCurrency(targetInvoice?.balance || 0, currentCompany)}) have been sent to ${emailData.recipientEmail}.`,
      recipientEmail: emailData.recipientEmail,
      recipientName: emailData.recipientName,
      invoiceNumber: targetInvoice?.invoiceNumber,
      autoDismissMs: 7000,
    });

    return { success: true, messageId: result.messageId };
  }, [invoices, customers, currentCompany, currentUser, showNotification]);

  const recordDispute = useCallback((invoiceId: string, disputeData: { reason: string; notes?: string }) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          status: 'disputed',
          disputeStatus: 'open',
          disputeReason: disputeData.reason,
          disputeNotes: disputeData.notes,
          disputeDate: new Date().toISOString().split('T')[0],
        };
      })
    );
  }, []);

  const resolveDispute = useCallback((invoiceId: string, resolutionNotes: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          status: inv.balance <= 0 ? 'paid' : (inv.overdueDays || 0) > 0 ? 'overdue' : 'sent',
          disputeStatus: 'resolved',
          disputeNotes: `${inv.disputeNotes || ''}\nResolved: ${resolutionNotes}`,
        };
      })
    );
  }, []);

  // Modal helpers
  const openCreateInvoiceModal = useCallback(() => {
    setEditingInvoice(null);
    setIsInvoiceModalOpen(true);
  }, []);

  const openEditInvoiceModal = useCallback((inv: Invoice) => {
    setEditingInvoice(inv);
    setIsInvoiceModalOpen(true);
  }, []);

  const openPaymentModalForInvoice = useCallback((inv: Invoice) => {
    setSelectedInvoiceForPayment(inv);
    setIsPaymentModalOpen(true);
  }, []);

  const openInvoiceDetail = useCallback((inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsDetailDrawerOpen(true);
  }, []);

  const openBillingDocumentModal = useCallback((inv: Invoice) => {
    setSelectedInvoiceForDocument(inv);
    setIsBillingDocumentModalOpen(true);
  }, []);

  const openSendEmailModal = useCallback((inv: Invoice) => {
    setSelectedInvoiceForSendEmail(inv);
    setIsSendEmailModalOpen(true);
  }, []);

  const openDisputeModal = useCallback((inv: Invoice) => {
    setSelectedInvoiceForDispute(inv);
    setIsDisputeModalOpen(true);
  }, []);

  // Reset/Clear Data helpers
  const resetToSampleData = useCallback(() => {
    const sample = getCompanyInitialData(activeCompanyId);
    setCustomers(sample.customers);
    setInvoices(sample.invoices);
    setPayments(sample.payments);
  }, [activeCompanyId]);

  const clearAllData = useCallback(() => {
    setInvoices([]);
    setPayments([]);
  }, []);

  return (
    <ReceivablesContext.Provider
      value={{
        activeTab,
        setActiveTab,
        companies,
        activeCompanyId,
        currentCompany,
        switchCompany,
        createCompany,
        updateCompany,
        deleteCompany,

        customers: processedCustomers,
        invoices: processedInvoices,
        payments,
        asOfDate,
        setAsOfDate,

        kpis,
        agingBuckets,
        cashFlowProjections,
        openInvoices,
        overdueInvoices,
        openInvoicesCount: openInvoices.length,
        overdueCount: overdueInvoices.length,

        lossRates,
        updateLossRate,
        resetLossRates,

        isForecastCleared,
        clearCashForecast,
        restoreCashForecast,
        updateForecastPeriod,

        filters,
        setFilters,
        filteredInvoices,
        resetFilters,

        addInvoice,
        updateInvoice,
        updateInvoiceDepositStatus,
        deleteInvoice,
        generateNextBillingNumber,

        recordPayment,
        deletePayment,

        addCustomer,
        updateCustomer,
        deleteCustomer,

        logReminder,
        sendBillingEmail,
        recordDispute,
        resolveDispute,

        notification,
        setNotification,
        showNotification,
        dismissNotification,
        isOnline,

        isInvoiceModalOpen,
        setIsInvoiceModalOpen,
        editingInvoice,
        setEditingInvoice,
        openCreateInvoiceModal,
        openEditInvoiceModal,

        isPaymentModalOpen,
        setIsPaymentModalOpen,
        selectedInvoiceForPayment,
        setSelectedInvoiceForPayment,
        openPaymentModalForInvoice,

        isDetailDrawerOpen,
        setIsDetailDrawerOpen,
        selectedInvoice,
        setSelectedInvoice,
        openInvoiceDetail,

        isCompanyModalOpen,
        setIsCompanyModalOpen,

        isBillingDocumentModalOpen,
        setIsBillingDocumentModalOpen,
        selectedInvoiceForDocument,
        setSelectedInvoiceForDocument,
        openBillingDocumentModal,

        isSendEmailModalOpen,
        setIsSendEmailModalOpen,
        selectedInvoiceForSendEmail,
        setSelectedInvoiceForSendEmail,
        openSendEmailModal,

        isImportModalOpen,
        setIsImportModalOpen,

        isDisputeModalOpen,
        setIsDisputeModalOpen,
        selectedInvoiceForDispute,
        setSelectedInvoiceForDispute,
        openDisputeModal,

        resetToSampleData,
        clearAllData,
      }}
    >
      {children}
    </ReceivablesContext.Provider>
  );
};

export const useReceivables = () => {
  const context = useContext(ReceivablesContext);
  if (!context) {
    throw new Error('useReceivables must be used within a ReceivablesProvider');
  }
  return context;
};
