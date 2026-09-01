import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  AlertTriangle,
  Calendar,
  Building2,
  CheckCircle2,
  DollarSign,
  ShieldAlert,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Invoice, Customer, Company } from '../types';
import { useReceivables } from '../context/ReceivablesContext';
import {
  generateDemandLetterPDF,
  downloadDemandLetterPDF,
  DemandLetterSeverity,
} from '../utils/pdfGenerator';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

interface DemandLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const DemandLetterModal: React.FC<DemandLetterModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const { currentCompany, invoices, asOfDate } = useReceivables();
  const [severity, setSeverity] = useState<DemandLetterSeverity>('formal_demand');
  const [deadlineDays, setDeadlineDays] = useState(5);
  const [signatoryName, setSignatoryName] = useState('John Suarez, CPA');
  const [signatoryTitle, setSignatoryTitle] = useState('Lead Auditor & Controller, Accounts Receivable & Recovery');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !customer) return null;

  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  const overdueInvoices = customerInvoices.filter(
    (i) => i.balance > 0 && (i.status === 'overdue' || (i.overdueDays || 0) > 0)
  );
  const activeInvoices = overdueInvoices.length > 0 ? overdueInvoices : customerInvoices.filter((i) => i.balance > 0);

  const totalOverdue = activeInvoices.reduce((s, i) => s + (i.balance || 0), 0);
  const maxOverdueDays = activeInvoices.reduce((m, i) => Math.max(m, i.overdueDays || 0), 0);
  const currencySymbol = getCurrencySymbol(currentCompany);

  // Auto-suggested default severity based on days overdue
  const autoSeverity: DemandLetterSeverity =
    maxOverdueDays >= 90 || totalOverdue >= 50000
      ? 'final_legal_demand'
      : maxOverdueDays >= 60
      ? 'urgent_warning'
      : maxOverdueDays >= 30
      ? 'formal_demand'
      : 'friendly_reminder';

  const handleDownload = () => {
    setIsGenerating(true);
    try {
      const deadlineDate = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      downloadDemandLetterPDF({
        customer,
        overdueInvoices: activeInvoices,
        company: currentCompany,
        asOfDate,
        severityLevel: severity,
        customDeadlineDate: deadlineDate,
        signatoryName,
        signatoryTitle,
      });
    } catch (err) {
      console.error('Error generating Demand Letter PDF:', err);
    } finally {
      setTimeout(() => setIsGenerating(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Generate Formal Demand Letter
              </h3>
              <p className="text-xs text-slate-500">
                {customer.name} ({customer.code}) • Overdue: {maxOverdueDays} Days Past Due
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Customer Overdue Summary Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-500 font-semibold">Total Demanded Outstanding</div>
              <div className="text-xl font-black text-rose-700 font-mono">
                {formatCurrency(totalOverdue, currentCompany)}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                {activeInvoices.length} delinquent invoice{activeInvoices.length > 1 ? 's' : ''} • Max Overdue: <strong>{maxOverdueDays} days</strong>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-[10px] text-slate-400 block font-semibold">Recommended Notice Tier</span>
              <span className="inline-block mt-0.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-800">
                {autoSeverity.toUpperCase().replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Notice Severity Selector */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Notice Severity & Legal Demand Tier <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                  severity === 'friendly_reminder'
                    ? 'border-blue-500 bg-blue-50/40 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="severity"
                  checked={severity === 'friendly_reminder'}
                  onChange={() => setSeverity('friendly_reminder')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-xs">Level 1: Courteous Reminder</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    For 1–30 days overdue. Friendly past-due statement requesting prompt reconciliation.
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                  severity === 'formal_demand'
                    ? 'border-amber-500 bg-amber-50/40 text-amber-900 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="severity"
                  checked={severity === 'formal_demand'}
                  onChange={() => setSeverity('formal_demand')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-xs">Level 2: Formal Demand Notice</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    For 31–60 days overdue. Formal reminder citing overdue days and demanding payment.
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                  severity === 'urgent_warning'
                    ? 'border-orange-500 bg-orange-50/40 text-orange-900 ring-2 ring-orange-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="severity"
                  checked={severity === 'urgent_warning'}
                  onChange={() => setSeverity('urgent_warning')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-xs">Level 3: Credit Suspension Warning</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    For 61–90 days overdue. Warning of credit facility freeze & order hold.
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                  severity === 'final_legal_demand'
                    ? 'border-red-600 bg-red-50/50 text-red-900 ring-2 ring-red-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="severity"
                  checked={severity === 'final_legal_demand'}
                  onChange={() => setSeverity('final_legal_demand')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-xs text-red-700">Level 4: Final Legal Demand</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    For 90+ days / high risk. Final 5-day statutory demand prior to litigation & collection referral.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Schedule of Overdue Invoices Included */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Included Delinquent Invoices ({activeInvoices.length})
            </label>
            <div className="border border-slate-200 rounded-xl max-h-36 overflow-y-auto divide-y divide-slate-100">
              {activeInvoices.map((inv) => (
                <div key={inv.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-slate-900 font-mono">{inv.invoiceNumber}</span>
                    <span className="text-slate-500 ml-2">Issued: {inv.issueDate} • Due: {inv.dueDate}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-red-600 font-bold font-mono">
                      {formatCurrency(inv.balance, currentCompany)}
                    </span>
                    <span className="text-[10px] text-rose-500 font-bold ml-1.5">
                      (+{inv.overdueDays || 0}d)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settlement Deadline & Signatory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Settlement Period (Business Days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Signatory Official
              </label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Generating PDF...' : 'Download Demand Letter (PDF)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
