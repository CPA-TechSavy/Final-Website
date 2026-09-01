export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partially_paid'
  | 'overdue'
  | 'paid'
  | 'disputed'
  | 'written_off';

export type DepositStatus =
  | 'pending_deposit'
  | 'deposited_in_bank'
  | 'deposited_in_ewallet'
  | 'cash_in_vault';

export type PaymentTerms =
  | 'Due on Receipt'
  | 'Net 15'
  | 'Net 30'
  | 'Net 45'
  | 'Net 60'
  | 'Net 90';

export type RiskRating = 'low' | 'medium' | 'high' | 'critical';

export type PaymentMethod =
  | 'Cash'
  | 'Cheques'
  | 'Bank Transfer'
  | 'eWALLETS'
  | 'ACH / Wire Transfer'
  | 'Corporate Check'
  | 'Credit Card'
  | 'Direct Debit'
  | 'Electronic Transfer'
  | 'Other';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface ReminderLog {
  id: string;
  date: string;
  type: 'friendly' | 'standard' | 'firm' | 'final_demand' | 'manual';
  subject: string;
  recipientEmail: string;
  sentBy: string;
  notes?: string;
}

export interface EmailDispatchLog {
  id: string;
  sentAt: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  senderName: string;
  status: 'sent' | 'delivered' | 'failed';
  triggerType: 'auto_on_create' | 'manual_dispatch' | 'reminder';
  pdfAttached: boolean;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  paymentTerms: PaymentTerms;
  poNumber?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number; // e.g. 0.08 for 8%
  taxAmount: number;
  amount: number; // total amount
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  notes?: string;
  disputeStatus?: 'open' | 'under_review' | 'resolved' | 'none';
  disputeReason?: string;
  disputeDate?: string;
  disputeNotes?: string;
  reminders: ReminderLog[];
  lastReminderDate?: string;
  emailDispatches?: EmailDispatchLog[];
  lastEmailedAt?: string;
  autoEmailSent?: boolean;
  overdueDays?: number;
  agingBucket?: 'Current (0-30)' | '31-60 Days' | '61-90 Days' | '91-120 Days' | '120+ Days';
  // Deposit & Settlement Tracking
  depositStatus?: DepositStatus; // 'pending_deposit' | 'deposited_in_bank' | 'deposited_in_ewallet' | 'cash_in_vault'
  depositChannel?: string; // e.g. "BDO Unibank", "BPI", "GCash", "Maya", "PayPal"
  depositDate?: string; // YYYY-MM-DD
  depositReference?: string; // Deposit Slip #, Trace #, or eWallet Ref #
  depositNotes?: string;
  createdAt: string;
}

export type CollectionDestination = 'bank_remittance' | 'ewallet_received' | 'cash_vault' | 'other';
export type RemittanceStatus = 'remitted_to_bank' | 'received_in_ewallet' | 'cleared' | 'in_transit' | 'pending_verification';

export interface PaymentDeduction {
  id: string;
  description: string; // e.g. "Sales Commission", "Bank / Wire Transfer Fee", "Withholding Tax (EWT)", "Brokerage / Agency Fee"
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number; // Gross settlement amount credited to invoice balance
  grossAmount?: number; // Gross collection amount before deductions
  deductions?: PaymentDeduction[]; // Optional line items of deductions/commissions
  totalDeductions?: number; // Total sum of deductions
  netCollectedAmount?: number; // Actual collected cash received by the company
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  notes?: string;
  recordedAt: string;

  // Collection Remittance & Receiving Channel Tracking
  collectionDestination?: CollectionDestination; // e.g. 'bank_remittance' vs 'ewallet_received'
  destinationAccountName?: string; // e.g. "BDO Unibank (#0012-3456-7890)" or "GCash (#0917-882-9102)"
  destinationAccountNumber?: string;
  remittanceStatus?: RemittanceStatus; // 'remitted_to_bank' | 'received_in_ewallet' | 'cleared' | 'in_transit'
  remittanceReference?: string; // Bank deposit slip # or eWallet trace #
  settlementDate?: string;
}

export interface Customer {
  id: string;
  name: string;
  code: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  creditLimit: number;
  paymentTerms: PaymentTerms;
  riskRating: RiskRating;
  notes?: string;
  // Dynamic stats computed
  totalBilled?: number;
  totalPaid?: number;
  totalOutstanding?: number;
  creditUtilization?: number; // % of credit limit used
  avgPaymentDays?: number;
  onTimePaymentRate?: number; // % 0-100
  openInvoiceCount?: number;
  overdueInvoiceCount?: number;
  oldestOverdueDays?: number;
}

export interface AgingBucketSummary {
  bucket: 'Current (0-30)' | '31-60 Days' | '61-90 Days' | '91-120 Days' | '120+ Days';
  label: string;
  minDays: number;
  maxDays: number;
  amount: number;
  count: number;
  percentage: number;
  expectedLossRate: number; // e.g. 0.01 for 1%
  badDebtReserve: number;
  color: string;
}

export interface KPISummary {
  totalReceivables: number;
  totalOpenInvoices: number;
  totalOverdue: number;
  overduePercentage: number;
  overdueCount: number;
  currentAmount: number;
  currentPercentage: number;
  dsoDays: number;
  dsoTarget: number;
  ceiPercentage: number; // Collection Effectiveness Index
  averageDaysToPay: number;
  disputedAmount: number;
  disputedCount: number;
  badDebtReserve: number;
  collectedThisMonth: number; // Gross collections MTD
  deductionsThisMonth: number; // Deductions / Commissions MTD
  netCollectedThisMonth: number; // Net actual cash collected MTD
  totalDeductionsAllTime: number;
  averageInvoiceSize: number;
  // Remittance & Receiving Channel Metrics
  totalRemittedToBank: number;
  totalReceivedViaEWallet: number;
  totalCashOrOther: number;
  bankCollectionsCount: number;
  eWalletCollectionsCount: number;
}

export interface FilterState {
  search: string;
  status: string; // 'all' | InvoiceStatus
  agingBucket: string; // 'all' | bucket name
  riskRating: string; // 'all' | RiskRating
  customerId: string; // 'all' | customerId
  dateFrom: string;
  dateTo: string;
  sortBy: 'dueDate' | 'issueDate' | 'amount' | 'balance' | 'customerName' | 'overdueDays';
  sortOrder: 'asc' | 'desc';
}

export interface CashFlowInflowProjection {
  period: string;
  expectedAmount: number;
  optimisticAmount: number;
  conservativeAmount: number;
  invoicesDueCount: number;
}

export interface CompanyBankInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingOrSwift?: string;
  branch?: string;
  instructions?: string;
}

export interface CompanyEWalletInfo {
  walletType: string; // e.g. GCash, Maya, PayPal, Wise, Venmo, GrabPay, etc.
  accountName: string;
  accountNumber: string; // mobile number or wallet ID
  qrCodeNote?: string;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  legalName?: string;
  currency: string;
  currencySymbol?: string;
  taxId?: string;
  industry: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  fiscalYearEnd?: string;
  dsoTarget?: number;
  createdAt: string;
  createdBy?: string;
  colorTheme?: string;
  logoInitials?: string;
  bankInfo?: CompanyBankInfo;
  secondaryBankInfo?: CompanyBankInfo;
  eWalletInfo?: CompanyEWalletInfo;
  secondaryEWalletInfo?: CompanyEWalletInfo;
  paymentInstructions?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean;
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'sending';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientEmail?: string;
  recipientName?: string;
  invoiceNumber?: string;
  timestamp: string;
  isNetworkError?: boolean;
  retryAction?: () => void | Promise<void>;
  autoDismissMs?: number;
}


