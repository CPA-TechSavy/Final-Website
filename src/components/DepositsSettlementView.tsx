import React, { useState } from 'react';
import {
  Landmark,
  Smartphone,
  Download,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Building2,
  CreditCard,
  FileSpreadsheet,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  X,
  Plus,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useReceivables } from '../context/ReceivablesContext';
import { Invoice, Customer, DepositStatus } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';
import {
  exportClientDepositLedgerToExcel,
  exportAllClientsDepositScheduleToExcel,
  formatDepositStatusLabel,
} from '../utils/excelExport';

export const DepositsSettlementView: React.FC = () => {
  const {
    customers,
    invoices,
    payments,
    currentCompany,
    asOfDate,
    updateInvoiceDepositStatus,
  } = useReceivables();

  const currencySymbol = getCurrencySymbol(currentCompany);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DepositStatus>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  // Editing single invoice deposit modal
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [modalStatus, setModalStatus] = useState<DepositStatus>('deposited_in_bank');
  const [modalChannel, setModalChannel] = useState('');
  const [modalReference, setModalReference] = useState('');
  const [modalDate, setModalDate] = useState(asOfDate);
  const [modalNotes, setModalNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle client accordion
  const toggleClientExpand = (clientId: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientId]: prev[clientId] === undefined ? false : !prev[clientId],
    }));
  };

  // Open Edit Modal
  const openEditModal = (inv: Invoice) => {
    setEditingInvoice(inv);
    const defaultStatus = inv.depositStatus || (inv.status === 'paid' ? 'deposited_in_bank' : 'pending_deposit');
    setModalStatus(defaultStatus);
    setModalChannel(inv.depositChannel || (defaultStatus === 'deposited_in_bank' ? (currentCompany.bankInfo?.bankName || 'BDO Unibank') : defaultStatus === 'deposited_in_ewallet' ? 'GCash' : 'Cash Box'));
    setModalReference(inv.depositReference || (inv.status === 'paid' ? `DEP-${inv.invoiceNumber}` : ''));
    setModalDate(inv.depositDate || asOfDate);
    setModalNotes(inv.depositNotes || '');
  };

  // Save Modal
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    updateInvoiceDepositStatus(editingInvoice.id, {
      depositStatus: modalStatus,
      depositChannel: modalChannel,
      depositReference: modalReference,
      depositDate: modalDate,
      depositNotes: modalNotes,
    });

    showToast(`Updated deposit status for ${editingInvoice.invoiceNumber}`);
    setEditingInvoice(null);
  };

  // Quick 1-Click Status Update
  const handleQuickStatus = (inv: Invoice, status: DepositStatus, defaultChannel: string) => {
    updateInvoiceDepositStatus(inv.id, {
      depositStatus: status,
      depositChannel: inv.depositChannel || defaultChannel,
      depositDate: inv.depositDate || asOfDate,
      depositReference: inv.depositReference || `${status === 'deposited_in_bank' ? 'BANK' : status === 'deposited_in_ewallet' ? 'EWAL' : 'VAULT'}-${Date.now().toString().slice(-6)}`,
    });
    showToast(`Marked ${inv.invoiceNumber} as ${formatDepositStatusLabel(status)}`);
  };

  // Filter clients and invoices
  const filteredCustomers = customers.filter((cust) => {
    if (selectedCustomerId !== 'all' && cust.id !== selectedCustomerId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCust = cust.name.toLowerCase().includes(q) || cust.code.toLowerCase().includes(q);
      const custInvoices = invoices.filter((i) => i.customerId === cust.id);
      const matchInv = custInvoices.some((i) => i.invoiceNumber.toLowerCase().includes(q));
      if (!matchCust && !matchInv) return false;
    }
    return true;
  });

  // Calculate Metrics
  let totalReceivablesBilled = 0;
  let totalDepositedBank = 0;
  let totalDepositedEWallet = 0;
  let totalPendingDeposit = 0;
  let totalCashInVault = 0;
  let totalOutstandingBalance = 0;

  invoices.forEach((inv) => {
    totalReceivablesBilled += inv.amount || 0;
    totalOutstandingBalance += inv.balance || 0;

    const depStatus = inv.depositStatus || (inv.status === 'paid' ? 'deposited_in_bank' : 'pending_deposit');
    const amt = inv.paidAmount > 0 ? inv.paidAmount : (inv.status === 'paid' ? inv.amount : 0);

    if (depStatus === 'deposited_in_bank') {
      totalDepositedBank += amt;
    } else if (depStatus === 'deposited_in_ewallet') {
      totalDepositedEWallet += amt;
    } else if (depStatus === 'cash_in_vault') {
      totalCashInVault += amt;
    } else {
      totalPendingDeposit += inv.balance || inv.amount || 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Landmark className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Client Receivables & Deposit Reconciliation
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {currentCompany.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Track all receivables categorized by client, verify whether collections have been deposited and reflected in the Bank or in eWallet, and download standard Excel ledgers per client.
            </p>
          </div>

          {/* Master Download Action */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => exportAllClientsDepositScheduleToExcel(customers, invoices, payments, currentCompany, asOfDate)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Master Schedule (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Billed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Receivables</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {formatCurrency(totalReceivablesBilled, currentCompany)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {invoices.length} total invoices issued
          </div>
        </div>

        {/* Deposited in Bank */}
        <div className="bg-white p-4 rounded-2xl border border-blue-100 bg-blue-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-blue-600" />
              Deposited in Bank
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-700 font-mono">
            {formatCurrency(totalDepositedBank, currentCompany)}
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">
            Reflected in Bank Accounts
          </div>
        </div>

        {/* Deposited in eWallet */}
        <div className="bg-white p-4 rounded-2xl border border-purple-100 bg-purple-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-purple-600" />
              Deposited in eWallet
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-700 font-mono">
            {formatCurrency(totalDepositedEWallet, currentCompany)}
          </div>
          <div className="text-[11px] text-purple-600 font-medium mt-1">
            GCash / Maya / Digital Wallets
          </div>
        </div>

        {/* Pending Deposit */}
        <div className="bg-white p-4 rounded-2xl border border-amber-100 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Pending Deposit
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-700 font-mono">
            {formatCurrency(totalPendingDeposit, currentCompany)}
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">
            Undeposited / Awaiting Clearing
          </div>
        </div>

        {/* Outstanding Unsettled */}
        <div className="bg-white p-4 rounded-2xl border border-rose-100 bg-rose-50/20 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold mb-1">
            <span>Outstanding Balance</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-700 font-mono">
            {formatCurrency(totalOutstandingBalance, currentCompany)}
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">
            Total active client exposure
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by client name, code, or invoice #..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {/* Client Selector */}
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Clients ({customers.length})</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          {/* Deposit Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Deposit Statuses</option>
            <option value="deposited_in_bank">Deposited in Bank</option>
            <option value="deposited_in_ewallet">Reflected in eWallet</option>
            <option value="pending_deposit">Pending Deposit / Undeposited</option>
            <option value="cash_in_vault">Cash in Vault</option>
          </select>
        </div>
      </div>

      {/* Client Receivables Grouping List */}
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
            <p className="text-sm font-semibold">No clients match the current filter or search criteria.</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            let customerInvoices = invoices.filter((i) => i.customerId === customer.id);

            // Apply status filter if selected
            if (statusFilter !== 'all') {
              customerInvoices = customerInvoices.filter((inv) => {
                const depStatus = inv.depositStatus || (inv.status === 'paid' ? 'deposited_in_bank' : 'pending_deposit');
                return depStatus === statusFilter;
              });
            }

            const totalBilled = customerInvoices.reduce((s, i) => s + (i.amount || 0), 0);
            const totalPaid = customerInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
            const totalBal = customerInvoices.reduce((s, i) => s + (i.balance || 0), 0);

            let bankDeposited = 0;
            let eWalletDeposited = 0;
            let pendingDep = 0;

            customerInvoices.forEach((inv) => {
              const depStatus = inv.depositStatus || (inv.status === 'paid' ? 'deposited_in_bank' : 'pending_deposit');
              const amt = inv.paidAmount > 0 ? inv.paidAmount : (inv.status === 'paid' ? inv.amount : 0);
              if (depStatus === 'deposited_in_bank') {
                bankDeposited += amt;
              } else if (depStatus === 'deposited_in_ewallet') {
                eWalletDeposited += amt;
              } else {
                pendingDep += inv.balance || inv.amount || 0;
              }
            });

            const isExpanded = expandedClients[customer.id] !== false; // expanded by default

            return (
              <div
                key={customer.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
              >
                {/* Client Card Header */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/50 border-b border-slate-200/80">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Customer Info & Toggle */}
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleClientExpand(customer.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors mt-0.5 cursor-pointer"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900">
                            {customer.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {customer.code}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            • Terms: {customer.paymentTerms}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Billing Contact: {customer.contactName} ({customer.email}) • Credit Limit: {currencySymbol}{customer.creditLimit.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Right: Summary Figures & Excel Download Button */}
                    <div className="flex items-center gap-3 flex-wrap lg:justify-end">
                      {/* Financial Pill Summary */}
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Total Billed</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {formatCurrency(totalBilled, currentCompany)}
                          </span>
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1" />
                        <div>
                          <span className="text-blue-500 text-[10px] block font-semibold">Bank Deposited</span>
                          <span className="font-bold text-blue-700 font-mono">
                            {formatCurrency(bankDeposited, currentCompany)}
                          </span>
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1" />
                        <div>
                          <span className="text-purple-500 text-[10px] block font-semibold">eWallet Deposited</span>
                          <span className="font-bold text-purple-700 font-mono">
                            {formatCurrency(eWalletDeposited, currentCompany)}
                          </span>
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1" />
                        <div>
                          <span className="text-rose-500 text-[10px] block font-semibold">Balance Due</span>
                          <span className="font-bold text-rose-700 font-mono">
                            {formatCurrency(totalBal, currentCompany)}
                          </span>
                        </div>
                      </div>

                      {/* Download Excel Per Client Button */}
                      <button
                        onClick={() => exportClientDepositLedgerToExcel(customer, invoices, payments, currentCompany, asOfDate)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0"
                        title="Download standard Excel ledger for this client"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Download Excel (.xlsx)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table of Receivables Under this Client */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    {customerInvoices.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        No active invoices or receivables recorded for this client under current filter.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-2.5 px-4">Invoice #</th>
                            <th className="py-2.5 px-3">Issue / Due Date</th>
                            <th className="py-2.5 px-3 text-right">Billed Amount</th>
                            <th className="py-2.5 px-3 text-right">Paid Amount</th>
                            <th className="py-2.5 px-3 text-right">Balance</th>
                            <th className="py-2.5 px-3 text-center">Invoice Status</th>
                            <th className="py-2.5 px-3">Deposit Status</th>
                            <th className="py-2.5 px-3">Bank / eWallet Channel</th>
                            <th className="py-2.5 px-3">Deposit Ref #</th>
                            <th className="py-2.5 px-4 text-center">Manual Update & Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {customerInvoices.map((inv) => {
                            const depStatus = inv.depositStatus || (inv.status === 'paid' ? 'deposited_in_bank' : 'pending_deposit');
                            const isPaid = inv.balance <= 0;

                            return (
                              <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                {/* Invoice # */}
                                <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                                  {inv.invoiceNumber}
                                </td>

                                {/* Dates */}
                                <td className="py-3 px-3">
                                  <div className="text-slate-900 font-medium">{inv.issueDate}</div>
                                  <div className="text-[10px] text-slate-400">Due: {inv.dueDate}</div>
                                </td>

                                {/* Billed */}
                                <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                                  {formatCurrency(inv.amount, currentCompany)}
                                </td>

                                {/* Paid */}
                                <td className="py-3 px-3 text-right font-mono font-medium text-emerald-700">
                                  {inv.paidAmount > 0 ? formatCurrency(inv.paidAmount, currentCompany) : '-'}
                                </td>

                                {/* Balance */}
                                <td className="py-3 px-3 text-right font-mono font-bold">
                                  <span className={inv.balance > 0 ? 'text-rose-600' : 'text-slate-400'}>
                                    {formatCurrency(inv.balance, currentCompany)}
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="py-3 px-3 text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isPaid
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : inv.status === 'overdue'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}
                                  >
                                    {inv.status.toUpperCase().replace(/_/g, ' ')}
                                  </span>
                                </td>

                                {/* Deposit Status Badge */}
                                <td className="py-3 px-3">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                      depStatus === 'deposited_in_bank'
                                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                                        : depStatus === 'deposited_in_ewallet'
                                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                                        : depStatus === 'cash_in_vault'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    {depStatus === 'deposited_in_bank' && <Landmark className="w-3 h-3 text-blue-600" />}
                                    {depStatus === 'deposited_in_ewallet' && <Smartphone className="w-3 h-3 text-purple-600" />}
                                    {depStatus === 'cash_in_vault' && <DollarSign className="w-3 h-3 text-emerald-600" />}
                                    {depStatus === 'pending_deposit' && <Clock className="w-3 h-3 text-amber-600" />}
                                    <span>{formatDepositStatusLabel(depStatus)}</span>
                                  </span>
                                </td>

                                {/* Bank / Channel */}
                                <td className="py-3 px-3 font-medium text-slate-700">
                                  {inv.depositChannel || (depStatus === 'deposited_in_bank' ? 'BDO Unibank' : depStatus === 'deposited_in_ewallet' ? 'GCash' : '-')}
                                </td>

                                {/* Deposit Ref # */}
                                <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                                  {inv.depositReference || '-'}
                                  {inv.depositDate && (
                                    <div className="text-[10px] text-slate-400">{inv.depositDate}</div>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-4 text-center">
                                  <div className="inline-flex items-center gap-1.5">
                                    {depStatus !== 'deposited_in_bank' && (
                                      <button
                                        onClick={() => handleQuickStatus(inv, 'deposited_in_bank', currentCompany.bankInfo?.bankName || 'BDO Unibank')}
                                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold cursor-pointer"
                                        title="Quick Mark Deposited to Bank"
                                      >
                                        <Landmark className="w-3.5 h-3.5 inline mr-1" />
                                        Bank
                                      </button>
                                    )}

                                    {depStatus !== 'deposited_in_ewallet' && (
                                      <button
                                        onClick={() => handleQuickStatus(inv, 'deposited_in_ewallet', 'GCash')}
                                        className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold cursor-pointer"
                                        title="Quick Mark Deposited to eWallet"
                                      >
                                        <Smartphone className="w-3.5 h-3.5 inline mr-1" />
                                        eWallet
                                      </button>
                                    )}

                                    <button
                                      onClick={() => openEditModal(inv)}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer flex items-center gap-1"
                                      title="Edit Deposit Details"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                                      <span>Edit</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Deposit Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Update Deposit Status: {editingInvoice.invoiceNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingInvoice.customerName} • Total Billed: {formatCurrency(editingInvoice.amount, currentCompany)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingInvoice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              {/* Deposit Status Selector */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Deposit / Settlement Clearance Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as DepositStatus)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="deposited_in_bank">Deposited in Bank (Reflected in Bank Statement)</option>
                  <option value="deposited_in_ewallet">Deposited in eWallet (Reflected in GCash / Maya / PayPal)</option>
                  <option value="cash_in_vault">Cash in Vault / Handled by Treasury</option>
                  <option value="pending_deposit">Pending Deposit / Unsettled</option>
                </select>
              </div>

              {/* Depository Bank / Channel */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Depository Bank Name / eWallet Provider
                </label>
                <input
                  type="text"
                  value={modalChannel}
                  onChange={(e) => setModalChannel(e.target.value)}
                  placeholder="e.g. BDO Unibank (Account #0012-3456-7890) or GCash"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Reference & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Deposit Slip # / Trace Ref #
                  </label>
                  <input
                    type="text"
                    value={modalReference}
                    onChange={(e) => setModalReference(e.target.value)}
                    placeholder="e.g. BDO-DEP-884910"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-mono text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Deposit / Clearance Date
                  </label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Reconciliation Notes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reconciliation Remarks & Notes
                </label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Verified with online bank ledger statement, confirmed clearing."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Deposit Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
