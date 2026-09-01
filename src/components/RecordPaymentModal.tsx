import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  DollarSign,
  Landmark,
  Banknote,
  FileCheck2,
  Building2,
  Plus,
  Trash2,
  Scissors,
  Calculator,
  Tag,
  Percent,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useReceivables } from '../context/ReceivablesContext';
import {
  PaymentMethod,
  PaymentDeduction,
} from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

export const RecordPaymentModal: React.FC = () => {
  const {
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    selectedInvoiceForPayment,
    setSelectedInvoiceForPayment,
    invoices,
    recordPayment,
    asOfDate,
    currentCompany,
  } = useReceivables();

  const currencySymbol = getCurrencySymbol(currentCompany);
  const openInvoices = invoices.filter((inv) => inv.balance > 0 && inv.status !== 'draft');

  const [invoiceId, setInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(asOfDate);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Optional deductions state (commissions, bank wire fees, withholding tax)
  const [showDeductions, setShowDeductions] = useState(false);
  const [deductions, setDeductions] = useState<PaymentDeduction[]>([]);

  const currentSelectedInvoice = openInvoices.find((inv) => inv.id === invoiceId) || selectedInvoiceForPayment;

  useEffect(() => {
    if (selectedInvoiceForPayment) {
      setInvoiceId(selectedInvoiceForPayment.id);
      setPaymentAmount(selectedInvoiceForPayment.balance);
      setPaymentDate(asOfDate);
      setNotes('');
      setShowDeductions(false);
      setDeductions([]);
    } else if (openInvoices.length > 0) {
      setInvoiceId(openInvoices[0].id);
      setPaymentAmount(openInvoices[0].balance);
      setPaymentDate(asOfDate);
      setNotes('');
      setShowDeductions(false);
      setDeductions([]);
    }
  }, [selectedInvoiceForPayment, isPaymentModalOpen, asOfDate]);

  if (!isPaymentModalOpen) return null;

  const handleInvoiceChange = (id: string) => {
    setInvoiceId(id);
    const target = openInvoices.find((inv) => inv.id === id);
    if (target) {
      setPaymentAmount(target.balance);
    }
  };

  const handleFillFullBalance = () => {
    if (currentSelectedInvoice) {
      setPaymentAmount(currentSelectedInvoice.balance);
    }
  };

  // Deduction Handlers
  const handleToggleDeductions = () => {
    if (!showDeductions) {
      setShowDeductions(true);
      if (deductions.length === 0) {
        setDeductions([
          { id: `ded-${Date.now()}`, description: 'Sales Commission / Bank Fee', amount: Math.round(paymentAmount * 0.03 * 100) / 100 },
        ]);
      }
    } else {
      setShowDeductions(false);
    }
  };

  const handleAddDeductionLine = (description = '', amount = 0) => {
    setDeductions((prev) => [
      ...prev,
      { id: `ded-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, description, amount },
    ]);
  };

  const handleUpdateDeduction = (id: string, field: 'description' | 'amount', value: any) => {
    setDeductions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: field === 'amount' ? Number(value) || 0 : value } : d))
    );
  };

  const handleRemoveDeduction = (id: string) => {
    setDeductions((prev) => prev.filter((d) => d.id !== id));
  };

  const handleApplyPreset = (presetName: string, calcFn: (amt: number) => number) => {
    const calcAmt = Math.round(calcFn(paymentAmount) * 100) / 100;
    handleAddDeductionLine(presetName, calcAmt);
  };

  // Calculations
  const validDeductions = showDeductions ? deductions : [];
  const totalDeductions = validDeductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const netCollectedCash = Math.max(0, (paymentAmount || 0) - totalDeductions);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedInvoice || paymentAmount <= 0) return;

    // Build fallback reference if left blank
    let finalRef = referenceNumber.trim();
    if (!finalRef) {
      if (paymentMethod === 'Cheques') {
        finalRef = `CHK-${Date.now().toString().slice(-6)}`;
      } else if (paymentMethod === 'eWALLETS') {
        finalRef = `EWAL-${Date.now().toString().slice(-6)}`;
      } else if (paymentMethod === 'Bank Transfer') {
        finalRef = `BT-${Date.now().toString().slice(-6)}`;
      } else {
        finalRef = `CASH-${Date.now().toString().slice(-6)}`;
      }
    }

    const filteredDeductions = showDeductions
      ? deductions.filter((d) => d.description.trim() !== '' && Number(d.amount) > 0)
      : [];

    const computedTotalDeductions = filteredDeductions.reduce((sum, d) => sum + Number(d.amount), 0);
    const computedNetCollected = Math.max(0, Number(paymentAmount) - computedTotalDeductions);

    recordPayment({
      invoiceId: currentSelectedInvoice.id,
      invoiceNumber: currentSelectedInvoice.invoiceNumber,
      customerId: currentSelectedInvoice.customerId,
      customerName: currentSelectedInvoice.customerName,
      amount: Number(paymentAmount),
      grossAmount: Number(paymentAmount),
      deductions: filteredDeductions,
      totalDeductions: computedTotalDeductions,
      netCollectedAmount: computedNetCollected,
      paymentDate,
      paymentMethod,
      referenceNumber: finalRef,
      notes,
    });

    setIsPaymentModalOpen(false);
    setSelectedInvoiceForPayment(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Record Customer Payment
              </h3>
              <p className="text-xs text-slate-500">
                Apply collection settlement to open receivables • {currentCompany.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsPaymentModalOpen(false);
              setSelectedInvoiceForPayment(null);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Target Invoice Selection */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Target Billing Invoice <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={invoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 font-semibold bg-white"
            >
              {openInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.customerName} (Bal: {formatCurrency(inv.balance, currentCompany)})
                </option>
              ))}
            </select>
          </div>

          {/* Current Outstanding Balance Card */}
          {currentSelectedInvoice && (
            <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between text-xs text-emerald-950 font-bold mb-1">
                <span>Outstanding Balance Due:</span>
                <span className="text-base font-extrabold text-emerald-800 font-mono">
                  {formatCurrency(currentSelectedInvoice.balance, currentCompany)}
                </span>
              </div>
              <div className="text-[11px] text-emerald-800 flex justify-between items-center">
                <span>Customer: <strong>{currentSelectedInvoice.customerName}</strong></span>
                <span>Due Date: <strong>{currentSelectedInvoice.dueDate}</strong></span>
              </div>
            </div>
          )}

          {/* Payment Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold">
                Payment Collection Amount ({currencySymbol}) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleFillFullBalance}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
              >
                Pay Full Balance ({formatCurrency(currentSelectedInvoice?.balance, currentCompany)})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={currentSelectedInvoice ? currentSelectedInvoice.balance : 9999999}
                required
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 font-bold text-sm bg-white"
              />
            </div>
          </div>

          {/* Payment Date & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold text-slate-900"
              >
                <option value="Bank Transfer">Bank Transfer / Wire Transfer</option>
                <option value="eWALLETS">eWALLETS (GCash / Maya / PayPal)</option>
                <option value="Cheques">Cheques</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Reference / OR # */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Payment Reference / Cheque # / Official Receipt # <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={
                paymentMethod === 'Cheques'
                  ? 'e.g. CHK-0098421'
                  : paymentMethod === 'Bank Transfer'
                  ? 'e.g. WIRE-8921820 or BDO-TXN-440182'
                  : paymentMethod === 'eWALLETS'
                  ? 'e.g. GCASH-REF-8910294 or MAYA-992104'
                  : 'e.g. OR-89104 or Cash Voucher Ref #'
              }
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-slate-900 bg-white font-semibold"
            />
          </div>

          {/* Optional Deductions & Fees Section */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-slate-800 text-xs">
                  Voluntary Deductions / Commissions (Optional)
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleDeductions}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  showDeductions
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {showDeductions ? 'Enabled' : '+ Add Deductions'}
              </button>
            </div>

            {showDeductions && (
              <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('Sales Commission (3%)', (amt) => amt * 0.03)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 hover:border-blue-400 text-slate-700 cursor-pointer"
                  >
                    3% Commission
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('Withholding Tax EWT (2%)', (amt) => (amt / 1.12) * 0.02)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 hover:border-blue-400 text-slate-700 cursor-pointer"
                  >
                    2% EWT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('Bank Transfer Fee', () => 50)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 hover:border-blue-400 text-slate-700 cursor-pointer"
                  >
                    {currencySymbol}50 Fee
                  </button>
                </div>

                {deductions.map((d) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Deduction description"
                      value={d.description}
                      onChange={(e) => handleUpdateDeduction(d.id, 'description', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1.5 text-slate-400 text-xs">{currencySymbol}</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={d.amount || ''}
                        onChange={(e) => handleUpdateDeduction(d.id, 'amount', e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-right"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeduction(d.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddDeductionLine('', 0)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Custom Line
                </button>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs font-bold text-slate-800">
                  <span>Net Collected Cash:</span>
                  <span className="font-mono text-emerald-700 text-sm">
                    {formatCurrency(netCollectedCash, currentCompany)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Payment Remarks & Settlement Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared via online banking, confirmation received from client AP."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 text-xs"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsPaymentModalOpen(false);
                setSelectedInvoiceForPayment(null);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!currentSelectedInvoice || paymentAmount <= 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Record & Settle Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
