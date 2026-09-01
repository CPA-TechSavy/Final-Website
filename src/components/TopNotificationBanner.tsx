import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Wifi,
  X,
  RefreshCw,
  Mail,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useReceivables } from '../context/ReceivablesContext';

export const TopNotificationBanner: React.FC = () => {
  const {
    notification,
    dismissNotification,
    isOnline,
    openInvoiceDetail,
    invoices,
  } = useReceivables();

  const [isRetrying, setIsRetrying] = useState(false);

  // Auto dismiss if configured
  useEffect(() => {
    if (!notification) return;

    // Do not auto-dismiss network errors so user can read and retry
    if (notification.type === 'error' && notification.isNetworkError) {
      return;
    }

    const duration = notification.autoDismissMs || (notification.type === 'success' ? 7000 : 9000);
    const timer = setTimeout(() => {
      dismissNotification();
    }, duration);

    return () => clearTimeout(timer);
  }, [notification, dismissNotification]);

  if (!notification) {
    // Show a small offline indicator if browser loses internet connection globally
    if (!isOnline) {
      return (
        <aside
          aria-label="Offline Mode Notification"
          className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md z-40 border-b border-amber-600 animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-slate-950 shrink-0" />
              <span>
                <strong>Working Offline:</strong> No internet connection detected. Sending customer emails requires an active network connection.
              </span>
            </div>
            <span className="text-[11px] bg-black/10 px-2 py-0.5 rounded font-mono">
              Offline Mode
            </span>
          </div>
        </aside>
      );
    }
    return null;
  }

  const isSuccess = notification.type === 'success';
  const isNetworkError = notification.type === 'error' && notification.isNetworkError;
  const isGeneralError = notification.type === 'error' && !notification.isNetworkError;
  const isSending = notification.type === 'sending';

  const handleRetry = async () => {
    if (notification.retryAction) {
      setIsRetrying(true);
      try {
        await notification.retryAction();
      } catch (err) {
        console.error('Error on notification retry:', err);
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const associatedInvoice = notification.invoiceNumber
    ? invoices.find((i) => i.invoiceNumber === notification.invoiceNumber)
    : null;

  return (
    <aside
      aria-label="System Notification"
      id="top-email-dispatch-notification"
      className="sticky top-0 z-50 px-3 sm:px-6 py-2.5 shadow-lg border-b transition-all duration-300 animate-in slide-in-from-top"
      style={{
        backgroundColor: isSuccess
          ? '#F0FDF4'
          : isNetworkError
          ? '#FEF2F2'
          : isGeneralError
          ? '#FFF1F2'
          : '#EFF6FF',
        borderColor: isSuccess
          ? '#86EFAC'
          : isNetworkError
          ? '#FCA5A5'
          : isGeneralError
          ? '#FDA4AF'
          : '#93C5FD',
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Icon & Main Message */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              isSuccess
                ? 'bg-emerald-100 text-emerald-800'
                : isNetworkError
                ? 'bg-rose-100 text-rose-800 animate-pulse'
                : isGeneralError
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-5 h-5" />}
            {isNetworkError && <WifiOff className="w-5 h-5" />}
            {isGeneralError && <AlertTriangle className="w-5 h-5" />}
            {isSending && <Loader2 className="w-5 h-5 animate-spin" />}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isSuccess
                    ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300'
                    : isNetworkError
                    ? 'bg-rose-100/90 text-rose-900 border-rose-300'
                    : isGeneralError
                    ? 'bg-red-100/90 text-red-900 border-red-300'
                    : 'bg-blue-100/90 text-blue-900 border-blue-300'
                }`}
              >
                {isSuccess
                  ? 'Email Dispatched Successfully'
                  : isNetworkError
                  ? 'Internet Connection Problem'
                  : isGeneralError
                  ? 'Email Dispatch Failed'
                  : 'Dispatching Billing Data...'}
              </span>

              {notification.invoiceNumber && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-white/90 text-slate-800 px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
                  <FileText className="w-3 h-3 text-blue-600" />
                  {notification.invoiceNumber}
                </span>
              )}

              {notification.recipientEmail && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white/90 text-slate-800 px-2 py-0.5 rounded border border-slate-300 shadow-2xs truncate max-w-xs">
                  <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">{notification.recipientEmail}</span>
                  {notification.recipientName && (
                    <span className="text-slate-500 text-[10px]">({notification.recipientName})</span>
                  )}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-900 font-semibold leading-snug">
              {notification.title}: <span className="font-normal text-slate-700">{notification.message}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Actions (Retry / View / Dismiss) */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
          {isNetworkError && notification.retryAction && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying Dispatch...' : 'Retry Send Now'}</span>
            </button>
          )}

          {isSuccess && associatedInvoice && (
            <button
              onClick={() => openInvoiceDetail(associatedInvoice)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              <span>View Invoice</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">
            {notification.timestamp}
          </span>

          <button
            onClick={dismissNotification}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors cursor-pointer"
            title="Dismiss Notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
