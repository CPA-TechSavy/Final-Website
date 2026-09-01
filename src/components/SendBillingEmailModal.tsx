import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Mail,
  Paperclip,
  CheckCircle2,
  Building2,
  FileText,
  Wifi,
  WifiOff,
  AlertTriangle,
  Landmark,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useReceivables } from '../context/ReceivablesContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

export const SendBillingEmailModal: React.FC = () => {
  const {
    isSendEmailModalOpen,
    setIsSendEmailModalOpen,
    selectedInvoiceForSendEmail,
    sendBillingEmail,
    currentCompany,
    customers,
    isOnline,
  } = useReceivables();

  const { currentUser } = useAuth();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [sendError, setSendError] = useState<{ isNetwork: boolean; message: string } | null>(null);

  const customer = selectedInvoiceForSendEmail
    ? customers.find((c) => c.id === selectedInvoiceForSendEmail.customerId)
    : null;

  const currencySymbol = getCurrencySymbol(currentCompany);

  useEffect(() => {
    if (selectedInvoiceForSendEmail) {
      const inv = selectedInvoiceForSendEmail;
      setRecipientEmail(inv.customerEmail || customer?.email || '');
      setRecipientName(inv.customerName || customer?.contactName || customer?.name || '');
      setSubject(`Official Billing Invoice ${inv.invoiceNumber} - ${currentCompany.legalName || currentCompany.name}`);
      
      const bank = currentCompany.bankInfo;
      const wallet = currentCompany.eWalletInfo;
      const bankDetails = bank?.accountNumber
        ? `\n\nBank Depository: ${bank.bankName || 'BDO Unibank'}\nAccount Name: ${bank.accountName || currentCompany.name}\nAccount Number: ${bank.accountNumber}\nPayment Reference: ${inv.invoiceNumber}`
        : '';
      const walletDetails = wallet?.accountNumber
        ? `\n\ne-Wallet Transfer (${wallet.walletType || 'GCash/Maya'}): ${wallet.accountNumber} (${wallet.accountName || currentCompany.name})`
        : '';

      setMessage(
        `Dear ${inv.customerName || 'Valued Customer'} Accounts Payable Team,\n\nPlease find attached the official billing invoice statement for ${inv.invoiceNumber}.\n\nSUMMARY OF CHARGES:\n• Total Billed: ${formatCurrency(inv.amount || 0, currentCompany)}\n• Outstanding Balance: ${formatCurrency(inv.balance || 0, currentCompany)}\n• Payment Due Date: ${inv.dueDate || 'Upon Receipt'}\n• Payment Terms: ${inv.paymentTerms || 'Net 30'}${bankDetails}${walletDetails}\n\nPlease quote Invoice #${inv.invoiceNumber} on your remittance advice or deposit slip.\n\nThank you for your business,\n${currentUser?.displayName || 'Finance Department'}\n${currentCompany.legalName || currentCompany.name}`
      );
      setSendError(null);
      setIsSent(false);
    }
  }, [selectedInvoiceForSendEmail, currentCompany, currentUser, customer]);

  if (!isSendEmailModalOpen || !selectedInvoiceForSendEmail) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setIsSending(true);

    try {
      const result = await sendBillingEmail(selectedInvoiceForSendEmail.id, {
        recipientEmail,
        recipientName,
        subject,
        message,
        attachPdf,
      });

      if (!result.success) {
        setSendError({
          isNetwork: !!result.isNetworkError,
          message: result.error || 'Failed to dispatch billing data to customer email.',
        });
        setIsSending(false);
        return;
      }

      setIsSending(false);
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        setIsSendEmailModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setSendError({
        isNetwork: !isOnline || err.message?.includes('network') || err.message?.includes('fetch'),
        message: err.message || 'An unexpected error occurred while sending email.',
      });
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-slate-900 my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  Send Invoice Statement
                </h3>
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {selectedInvoiceForSendEmail.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Amount Due: <strong className="text-slate-900">{formatCurrency(selectedInvoiceForSendEmail.balance || 0, currentCompany)}</strong> • Client: {selectedInvoiceForSendEmail.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSendEmailModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Internet Connection Status Bar */}
        <div className="mt-3 shrink-0">
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200 animate-pulse'
            }`}
          >
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  <span>
                    <strong>Network Connected:</strong> Ready to transmit billing statement to recipient.
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-rose-600" />
                  <span>
                    <strong>No Internet Connection:</strong> Sending data to recipient will fail until connection is restored.
                  </span>
                </>
              )}
            </div>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                isOnline ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
              }`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* In-Modal Error Warning if send failed */}
        {sendError && (
          <div className="mt-3 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-1.5 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-rose-800">
              {sendError.isNetwork ? (
                <WifiOff className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>
                {sendError.isNetwork
                  ? 'Internet Connection Problem'
                  : 'Email Dispatch Error'}
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed">{sendError.message}</p>
            <p className="text-[11px] text-slate-500">
              A notification banner has also been displayed at the top of your workspace with options to retry.
            </p>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSend} className="space-y-3 text-xs mt-3 overflow-y-auto pr-1 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Recipient Contact Name
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Maria Santos / Accounts Payable"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Recipient Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="billing@customer.com"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Email Subject Line
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                Statement Message Body
              </label>
              <span className="text-[11px] text-slate-400">
                Includes automated invoice and bank instructions
              </span>
            </div>
            <textarea
              rows={6}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Automated Attachment & Data Transmission Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="font-bold text-slate-800 block text-xs">
                    Attach Certified Corporate PDF Invoice
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {selectedInvoiceForSendEmail.invoiceNumber}.pdf
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-sends full line items, VAT breakdown & depository info</span>
              </span>
              <span className="font-mono font-semibold text-slate-700">
                {formatCurrency(selectedInvoiceForSendEmail.balance || 0, currentCompany)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 shrink-0 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSendEmailModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer text-xs transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSending || isSent}
                className={`px-5 py-2.5 rounded-xl text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md text-xs disabled:opacity-50 ${
                  isSent
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : sendError?.isNetwork
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSent ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dispatched to Customer!</span>
                  </>
                ) : isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting Data...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{sendError?.isNetwork ? 'Retry Send to Email' : 'Send Data to Customer Email'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
