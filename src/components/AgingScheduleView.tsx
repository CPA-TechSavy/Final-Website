import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  DollarSign,
  AlertTriangle,
  Download,
  Filter,
  FileSpreadsheet,
  Send,
  CreditCard,
  FileText,
  Search,
  Sliders,
  RotateCcw,
  Check,
  Building2,
  FileDown,
  Sparkles,
  Percent,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useReceivables } from '../context/ReceivablesContext';
import { Customer, Invoice } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';
import { DemandLetterModal } from './DemandLetterModal';

export const AgingScheduleView: React.FC = () => {
  const {
    agingBuckets,
    openInvoices,
    customers,
    kpis,
    asOfDate,
    openInvoiceDetail,
    openSendEmailModal,
    openPaymentModalForInvoice,
    openBillingDocumentModal,
    currentCompany,
    lossRates,
    updateLossRate,
    resetLossRates,
  } = useReceivables();

  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLossEditor, setShowLossEditor] = useState(false);
  const [demandLetterCustomer, setDemandLetterCustomer] = useState<Customer | null>(null);
  const [isDemandModalOpen, setIsDemandModalOpen] = useState(false);

  const currencySymbol = getCurrencySymbol(currentCompany);

  const filteredInvoices = openInvoices.filter((inv) => {
    if (selectedBucket !== 'all' && inv.agingBucket !== selectedBucket) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        (inv.poNumber && inv.poNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenDemandLetter = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setDemandLetterCustomer(cust);
      setIsDemandModalOpen(true);
    }
  };

  const exportAgingToExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Summary Sheet
    const summaryData = [
      ['ACCOUNTS RECEIVABLE AGING & CECL BAD DEBT RESERVE SCHEDULE'],
      ['Entity / Company:', currentCompany.name, 'Entity Code:', currentCompany.code],
      ['As of Cutoff Date:', asOfDate, 'Report Currency:', currentCompany.currency],
      ['Generated On:', new Date().toLocaleString()],
      [],
      ['Aging Bracket', 'Invoices Count', `Total Outstanding (${currentCompany.currency})`, '% of Total AR', 'Configured Loss %', `Bad Debt Provision (${currentCompany.currency})`, `Net AR Balance (${currentCompany.currency})`],
      ...agingBuckets.map((b) => [
        b.label,
        b.count,
        b.amount,
        `${b.percentage}%`,
        `${(b.expectedLossRate * 100).toFixed(1)}%`,
        b.badDebtReserve,
        b.amount - b.badDebtReserve,
      ]),
      [],
      [
        'TOTAL RECEIVABLES',
        kpis.totalOpenInvoices,
        kpis.totalReceivables,
        '100.0%',
        `${((kpis.badDebtReserve / (kpis.totalReceivables || 1)) * 100).toFixed(1)}%`,
        kpis.badDebtReserve,
        kpis.totalReceivables - kpis.badDebtReserve,
      ],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 26 },
      { wch: 16 },
      { wch: 20 },
      { wch: 26 },
      { wch: 26 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Aging Summary');

    // 2. Invoices Detail Schedule
    const detailData = [
      ['INVOICE-LEVEL DETAILED AGING RECONCILIATION SCHEDULE'],
      ['Entity:', currentCompany.name, 'As of Date:', asOfDate],
      [],
      ['Invoice #', 'Customer Code', 'Customer Name', 'Issue Date', 'Due Date', 'Days Overdue', 'Aging Bucket', `Invoice Amount (${currentCompany.currency})`, `Paid Amount (${currentCompany.currency})`, `Open Balance (${currentCompany.currency})`, 'Loss % Applied', `Provision Reserve (${currentCompany.currency})`, 'Status'],
      ...openInvoices.map((inv) => {
        const rate = lossRates[inv.agingBucket as keyof typeof lossRates] || 0.05;
        const reserve = Math.round(inv.balance * rate * 100) / 100;
        return [
          inv.invoiceNumber,
          inv.customerCode || 'N/A',
          inv.customerName,
          inv.issueDate,
          inv.dueDate,
          inv.overdueDays || 0,
          inv.agingBucket,
          inv.amount,
          inv.paidAmount,
          inv.balance,
          `${(rate * 100).toFixed(1)}%`,
          reserve,
          inv.status,
        ];
      }),
    ];

    const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
    wsDetail['!cols'] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 30 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 22 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 22 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detailed Invoices');

    const cleanName = currentCompany.name.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `Aging_Matrix_Schedule_${cleanName}_${asOfDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Accounts Receivable Aging & CECL Reserve Schedule
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              {currentCompany.currency} ({currencySymbol})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            As of <span className="font-semibold text-slate-800">{asOfDate}</span> • Current Expected Credit Losses (CECL) provision matrix & bad debt loss rates
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowLossEditor(!showLossEditor)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[36px] ${
              showLossEditor
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>{showLossEditor ? 'Close Loss Matrix' : 'Edit Overdue Loss %'}</span>
          </button>

          <button
            onClick={exportAgingToExcel}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs min-h-[36px]"
            title="Download multi-tab Excel Aging Schedule with CECL Reserve computations"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Matrix (Excel)</span>
          </button>
        </div>
      </div>

      {/* Interactive Overdue Percentage Loss Editor Panel */}
      {showLossEditor && (
        <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Custom Expected Loss Provision Rates per Aging Bracket
                </h3>
                <p className="text-xs text-slate-500">
                  Adjust expected default percentages based on historical migration analysis or audit guidelines.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetLossRates}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset to Standard Defaults</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {agingBuckets.map((bucket) => {
              const currentRate = lossRates[bucket.bucket as keyof typeof lossRates] ?? bucket.expectedLossRate;
              const ratePercent = Math.round(currentRate * 100);

              return (
                <div
                  key={bucket.bucket}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">{bucket.label}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: bucket.color }}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Loss Rate:</span>
                      <span className="font-bold text-blue-700 font-mono text-sm">{ratePercent}%</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={ratePercent}
                        onChange={(e) => updateLossRate(bucket.bucket as keyof typeof lossRates, Number(e.target.value) / 100)}
                        className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                      <div className="relative w-16 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={ratePercent}
                          onChange={(e) => updateLossRate(bucket.bucket as keyof typeof lossRates, Number(e.target.value) / 100)}
                          className="w-full text-right pr-4 pl-1.5 py-1 text-xs font-bold font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="absolute right-1.5 top-1 text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Reserve:</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(bucket.badDebtReserve, currentCompany)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
            <span className="font-medium">
              Changes take effect immediately across Bad Debt Reserves, Net Realizable Value, and Executive KPIs.
            </span>
            <button
              onClick={() => setShowLossEditor(false)}
              className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer shadow-2xs shrink-0"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Aging Bucket Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {agingBuckets.map((bucket) => {
          const isSelected = selectedBucket === bucket.bucket;
          return (
            <div
              key={bucket.bucket}
              onClick={() => setSelectedBucket(isSelected ? 'all' : bucket.bucket)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 truncate">{bucket.label}</span>
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: bucket.color }}
                />
              </div>

              <div className="mt-2.5 text-lg sm:text-xl font-black text-slate-900 font-mono">
                {formatCurrency(bucket.amount, currentCompany)}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                <span>{bucket.count} invoices ({bucket.percentage}%)</span>
                <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                  Loss: {(bucket.expectedLossRate * 100).toFixed(0)}%
                </span>
              </div>

              <div className="mt-1 text-[10px] text-red-600 font-bold text-right font-mono">
                Reserve: {formatCurrency(bucket.badDebtReserve, currentCompany)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reserve Summary Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Total Required Bad Debt Reserve (ASC 326 / IFRS 9 CECL Matrix)
            </h4>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5 font-mono">
              {formatCurrency(kpis.badDebtReserve, currentCompany)}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">
                ({((kpis.badDebtReserve / (kpis.totalReceivables || 1)) * 100).toFixed(1)}% of Gross AR)
              </span>
            </div>
            <div className="text-xs text-emerald-400 font-semibold font-mono mt-0.5">
              Net Realizable Accounts Receivable: {formatCurrency(Math.max(0, kpis.totalReceivables - kpis.badDebtReserve), currentCompany)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLossEditor(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Configure Loss %</span>
          </button>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Filter Bucket:</span>
            <select
              value={selectedBucket}
              onChange={(e) => setSelectedBucket(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="all">All Aging Buckets ({openInvoices.length})</option>
              {agingBuckets.map((b) => (
                <option key={b.bucket} value={b.bucket}>
                  {b.label} ({b.count})
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice, client, PO..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Issue Date</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4 text-center">Overdue Days</th>
                <th className="py-3.5 px-4">Aging Bucket</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4 text-right">Expected Loss %</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                    No matching invoices found in this aging category.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const rate = lossRates[inv.agingBucket as keyof typeof lossRates] ?? 0.05;
                  const isDelinquent = (inv.overdueDays || 0) > 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-blue-600">
                        <button
                          onClick={() => openInvoiceDetail(inv)}
                          className="hover:underline cursor-pointer font-mono"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{inv.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">
                          {inv.customerCode || 'CUST'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{inv.issueDate}</td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-mono">{inv.dueDate}</td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {(inv.overdueDays || 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800 text-[10px]">
                            +{inv.overdueDays} days
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 text-[10px]">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {inv.agingBucket}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                        {formatCurrency(inv.balance, currentCompany)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                        <span className="font-bold text-red-600">{(rate * 100).toFixed(0)}%</span>
                        <div className="text-[10px] text-slate-400">
                          Res: {formatCurrency(inv.balance * rate, currentCompany)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isDelinquent && (
                            <button
                              onClick={() => handleOpenDemandLetter(inv.customerId)}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Generate Formal Demand Letter (PDF)"
                            >
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>Demand Letter</span>
                            </button>
                          )}
                          <button
                            onClick={() => openBillingDocumentModal(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Generate PDF Statement"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openSendEmailModal(inv)}
                            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Send Email Notice"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openPaymentModalForInvoice(inv)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Record Remittance"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Demand Letter Modal */}
      <DemandLetterModal
        isOpen={isDemandModalOpen}
        onClose={() => {
          setIsDemandModalOpen(false);
          setDemandLetterCustomer(null);
        }}
        customer={demandLetterCustomer}
      />
    </div>
  );
};
