/**
 * Network Connectivity & Email Dispatch Utilities
 */

import { Invoice, Customer, Company } from '../types';
import { formatCurrency, getCurrencySymbol } from './currency';

/**
 * Checks whether the browser has active internet connectivity.
 * Combines navigator.onLine with an active probe to ensure real internet reachability.
 */
export async function checkInternetConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  try {
    // Quick ping probe with a 3-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch('/api/health', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    // If the server is offline or internet is down
    return false;
  }
}

export interface EmailDispatchPayload {
  invoiceId: string;
  invoiceNumber: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  message: string;
  attachPdf: boolean;
  customerData?: {
    name: string;
    code?: string;
    contactName?: string;
    email: string;
    phone?: string;
    address?: string;
  };
  invoiceData?: {
    issueDate: string;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    balanceDue: number;
    paymentTerms: string;
    poNumber?: string;
    itemsCount: number;
  };
  companyData?: {
    name: string;
    currency: string;
    bankName?: string;
    accountNumber?: string;
    eWalletType?: string;
    eWalletNumber?: string;
  };
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  isNetworkError?: boolean;
  error?: string;
  sentAt?: string;
  recipientEmail: string;
  invoiceNumber: string;
}

/**
 * Dispatches the customer billing invoice and associated accounting data to the recipient's email.
 */
export async function dispatchCustomerBillingEmail(
  payload: EmailDispatchPayload
): Promise<EmailDispatchResult> {
  // 1. First verify active internet connection
  const isConnected = await checkInternetConnection();
  if (!isConnected) {
    return {
      success: false,
      isNetworkError: true,
      error: 'No active Internet Connection detected. Unable to reach mail gateway.',
      recipientEmail: payload.recipientEmail,
      invoiceNumber: payload.invoiceNumber,
    };
  }

  // 2. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!payload.recipientEmail || !emailRegex.test(payload.recipientEmail.trim())) {
    return {
      success: false,
      isNetworkError: false,
      error: `Invalid recipient email address format: "${payload.recipientEmail}". Please check and correct the email.`,
      recipientEmail: payload.recipientEmail,
      invoiceNumber: payload.invoiceNumber,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('/api/email/dispatch-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sentAt: data.sentAt || new Date().toISOString(),
      recipientEmail: payload.recipientEmail,
      invoiceNumber: payload.invoiceNumber,
    };
  } catch (err: any) {
    const isNetwork =
      err.name === 'AbortError' ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError') ||
      err.message?.includes('network');

    return {
      success: false,
      isNetworkError: isNetwork,
      error: isNetwork
        ? 'Internet Connection timed out or disconnected while transmitting email data.'
        : err.message || 'Unknown error occurred while dispatching email.',
      recipientEmail: payload.recipientEmail,
      invoiceNumber: payload.invoiceNumber,
    };
  }
}
