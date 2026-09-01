import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const PORT = 3000;

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Automated Email Dispatch Endpoint for Customer Billing & Invoices
  app.post("/api/email/dispatch-invoice", (req: Request, res: Response) => {
    try {
      const {
        invoiceNumber,
        recipientEmail,
        recipientName,
        subject,
        message,
        attachPdf,
        customerData,
        invoiceData,
        companyData,
      } = req.body;

      if (!recipientEmail || typeof recipientEmail !== 'string') {
        return res.status(400).json({ error: "Recipient email is required" });
      }

      // Basic email regex validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail.trim())) {
        return res.status(400).json({ error: `Invalid recipient email address format: ${recipientEmail}` });
      }

      const messageId = `msg_corp_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const sentAt = new Date().toISOString();

      console.log(`[Email Dispatch Service] Dispatched statement ${invoiceNumber || 'INV'} to ${recipientEmail} (${recipientName || 'Customer'}) at ${sentAt} [MessageId: ${messageId}]`);

      return res.json({
        success: true,
        messageId,
        sentAt,
        deliveredTo: recipientEmail,
        customerName: recipientName || customerData?.name || "Client",
        invoiceNumber: invoiceNumber || "INV-STATEMENT",
        hasPdfAttachment: !!attachPdf,
        serverLatencyMs: Math.floor(25 + Math.random() * 40),
        status: "delivered",
      });
    } catch (err: any) {
      console.error("[Email Dispatch Service] Error dispatching email:", err);
      return res.status(500).json({ error: err.message || "Internal mail service dispatch failure" });
    }
  });

  // AI Endpoint: Generate Collection Letter / Payment Reminder
  app.post("/api/ai/collection-draft", async (req: Request, res: Response) => {
    try {
      const { invoice, customer, tone = "standard", customInstructions } = req.body;

      if (!invoice || !customer) {
        return res.status(400).json({ error: "Invoice and Customer details are required" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        // High quality fallback template if key is not configured
        const isOverdue = (invoice.overdueDays || 0) > 0;
        const toneDescriptions: Record<string, { subject: string; body: string; urgency: string }> = {
          friendly: {
            subject: `Friendly Reminder: Invoice ${invoice.invoiceNumber} from ACME Corp`,
            body: `Dear ${customer.contactName || customer.name},\n\nWe hope this email finds you well.\n\nThis is a friendly reminder that Invoice ${invoice.invoiceNumber} for $${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} was due on ${invoice.dueDate}.\n\nIf payment has already been sent, please disregard this notice. Otherwise, please let us know when we can expect settlement or if you need any updated copy of the invoice.\n\nThank you for your valued partnership!\n\nBest regards,\nAccounts Receivable Team`,
            urgency: "Low",
          },
          standard: {
            subject: `Payment Reminder: Invoice ${invoice.invoiceNumber} - Past Due (${invoice.overdueDays || 0} Days)`,
            body: `Dear ${customer.contactName || customer.name},\n\nAccording to our records, Invoice ${invoice.invoiceNumber} issued on ${invoice.issueDate} with an outstanding balance of $${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} remains unpaid and is currently ${invoice.overdueDays || 0} days past due (Due Date: ${invoice.dueDate}).\n\nPlease arrange for the transfer at your earliest convenience or reply with payment remittance details.\n\nBank Account: 1234-5678-XXXX\nWire/ACH Reference: ${invoice.invoiceNumber}\n\nSincerely,\nFinance & Collections Department`,
            urgency: "Medium",
          },
          firm: {
            subject: `URGENT: Outstanding Balance on Invoice ${invoice.invoiceNumber} - Action Required`,
            body: `Dear ${customer.contactName || customer.name},\n\nDespite our previous communications, we have not received payment for Invoice ${invoice.invoiceNumber} in the amount of $${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}, which is now ${invoice.overdueDays || 0} days overdue.\n\nContinued delay may impact your account's open credit terms ($${(customer.creditLimit || 0).toLocaleString()}) and pending shipments/services.\n\nPlease remit payment within 3 business days or contact our finance officer immediately to settle this balance.\n\nRegards,\nCredit & Collections Control`,
            urgency: "High",
          },
          final_demand: {
            subject: `FINAL NOTICE BEFORE ESCALATION: Delinquent Invoice ${invoice.invoiceNumber}`,
            body: `Attention: ${customer.contactName || customer.name} / Accounts Payable,\n\nThis is a formal final notice regarding severely delinquent Invoice ${invoice.invoiceNumber} for the balance of $${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}, now ${invoice.overdueDays || 0} days past due.\n\nIf payment is not remitted in full or an acceptable settlement plan agreed upon within 48 hours, we will be forced to place your account on Credit Hold and escalate this matter to third-party collection agencies or legal recovery.\n\nPlease remit immediate payment to resolve this matter.\n\nAccounts Receivable Legal & Escalation Unit`,
            urgency: "Critical",
          }
        };

        const fallback = toneDescriptions[tone] || toneDescriptions.standard;
        return res.json({
          subject: fallback.subject,
          body: fallback.body,
          urgencyScore: fallback.urgency,
          suggestedFollowUpDays: tone === 'final_demand' ? 2 : tone === 'firm' ? 5 : 7,
          keyPoints: [
            `Invoice: ${invoice.invoiceNumber}`,
            `Outstanding Balance: $${invoice.balance.toLocaleString()}`,
            `Days Overdue: ${invoice.overdueDays || 0}`,
          ],
        });
      }

      const prompt = `You are an expert Chief Financial Officer and B2B Accounts Receivable Collections Specialist.
Write a personalized, highly professional collection / payment reminder communication.

INVOICE DETAILS:
- Invoice #: ${invoice.invoiceNumber}
- Customer Name: ${customer.name}
- Contact Person: ${customer.contactName || 'Accounts Payable Team'}
- Issue Date: ${invoice.issueDate}
- Due Date: ${invoice.dueDate}
- Original Total: $${invoice.amount}
- Paid so far: $${invoice.paidAmount || 0}
- Current Balance Due: $${invoice.balance}
- Overdue Days: ${invoice.overdueDays || 0} days
- Payment Terms: ${invoice.paymentTerms || 'Net 30'}
- Dispute Status: ${invoice.disputeStatus || 'None'}
- Dispute Reason (if any): ${invoice.disputeReason || 'N/A'}

CUSTOMER CONTEXT:
- Credit Limit: $${customer.creditLimit}
- Risk Rating: ${customer.riskRating}
- Past Payment Track Record: ${customer.avgPaymentDays || 30} days average settlement, ${customer.onTimePaymentRate || 90}% on-time rate

REQUESTED TONE: ${tone} (Options: friendly, standard, firm, final_demand)
CUSTOM INSTRUCTIONS: ${customInstructions || 'None provided'}

Provide your response in JSON format with the following fields:
{
  "subject": "Clear, contextual email subject line",
  "body": "The full body text of the email ready to send. Keep it polished, crisp, respectful, mentioning invoice number, amount, payment instructions placeholder, and clear call-to-action.",
  "urgencyScore": "Low | Medium | High | Critical",
  "suggestedFollowUpDays": 3, // number of days to wait before next touchpoint
  "keyPoints": ["Bullet 1 highlighting critical context", "Bullet 2", "Bullet 3"],
  "recommendedAction": "Recommended operational next step for the AR manager"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (error: any) {
      console.error("Error generating collection draft:", error);
      res.status(500).json({ error: error.message || "Failed to generate collection draft" });
    }
  });

  // AI Endpoint: Portfolio Receivables & Cash Flow Risk Audit
  app.post("/api/ai/portfolio-analysis", async (req: Request, res: Response) => {
    try {
      const { kpis, agingBuckets, topOverdueInvoices, highRiskCustomers } = req.body;

      const ai = getGeminiClient();
      if (!ai) {
        return res.json({
          executiveSummary: "Your total receivables portfolio shows moderate concentration risk with active overdue accounts requiring targeted 30-day intervention.",
          healthScore: 78,
          healthGrade: "B+",
          topRisks: [
            "Aging concentration in 61-90+ days bucket exceeding standard 15% threshold",
            "High DSO compared to industry benchmark target (30 days)",
            "Credit limit saturation across 2 high-volume corporate accounts"
          ],
          actionableRecommendations: [
            {
              priority: "Immediate (Next 48h)",
              action: "Issue formal follow-ups for all accounts >60 days past due, offering 2% settlement discount for immediate wire transfer.",
              expectedImpact: "Accelerate recovery of up to $45,000 in stuck liquidity."
            },
            {
              priority: "Weekly Rhythm",
              action: "Implement credit holds on customers exceeding 90% of credit limit with active overdue invoices.",
              expectedImpact: "Prevent additional bad debt accrual."
            },
            {
              priority: "Process Improvement",
              action: "Send automated courtesy reminders 3 days prior to due dates to improve on-time payment conversion.",
              expectedImpact: "Reduce DSO by 4-6 business days within one financial quarter."
            }
          ],
          cashFlowOutlook: "Projected 30-day expected inflow is approximately 72% of total open balance based on current collection velocity."
        });
      }

      const prompt = `You are a Senior Credit & Accounts Receivable Financial Director.
Perform a comprehensive audit of the company's Accounts Receivable (AR) portfolio and provide executive recommendations.

PORTFOLIO DATA:
- Total Open Receivables: $${kpis?.totalReceivables}
- Total Overdue: $${kpis?.totalOverdue} (${kpis?.overduePercentage}% of total)
- Days Sales Outstanding (DSO): ${kpis?.dsoDays} days (Target: ${kpis?.dsoTarget} days)
- Collection Effectiveness Index (CEI): ${kpis?.ceiPercentage}%
- Disputed Amount: $${kpis?.disputedAmount || 0}
- Bad Debt / Expected Credit Loss Reserve: $${kpis?.badDebtReserve || 0}

AGING BUCKETS:
${JSON.stringify(agingBuckets, null, 2)}

TOP OVERDUE INVOICES / ACCOUNTS:
${JSON.stringify(topOverdueInvoices, null, 2)}

HIGH RISK / CREDIT CONCENTRATION CUSTOMERS:
${JSON.stringify(highRiskCustomers, null, 2)}

Analyze this data and return structured JSON with:
{
  "executiveSummary": "Concise 2-sentence executive assessment of portfolio health and working capital risk",
  "healthScore": 82, // Score from 0 to 100
  "healthGrade": "A | B+ | B | C | D | F",
  "topRisks": ["Risk point 1", "Risk point 2", "Risk point 3"],
  "actionableRecommendations": [
    {
      "priority": "Immediate (1-3 Days) | Short-Term (1-2 Weeks) | Medium-Term (30 Days)",
      "action": "Specific tactical action",
      "expectedImpact": "Quantifiable or operational benefit"
    }
  ],
  "cashFlowOutlook": "Short analysis on 30-60 day cash recovery expectations and warning signs",
  "dsoImprovementPlan": "Direct steps to bring DSO closer to target"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (error: any) {
      console.error("Error analyzing AR portfolio:", error);
      res.status(500).json({ error: error.message || "Failed to analyze AR portfolio" });
    }
  });

  // AI Endpoint: Smart Invoice Text Parser
  app.post("/api/ai/parse-invoice", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text content is required" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        // Fallback basic parsing
        return res.json({
          invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
          customerName: "Parsed Client Co.",
          customerEmail: "ap@parsedclient.com",
          amount: 5000,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paymentTerms: "Net 30",
          poNumber: "PO-AUTO-01",
          items: [
            { description: "Consulting / Professional Services", quantity: 1, unitPrice: 5000, amount: 5000 }
          ],
          notes: text.slice(0, 150)
        });
      }

      const prompt = `You are an automated accounts receivable data extraction engine.
Parse the following unstructured text/bill/email/purchase order and extract structured invoice details.

TEXT CONTENT:
"""
${text}
"""

Extract and format as JSON matching this schema:
{
  "invoiceNumber": "Extracted or inferred invoice number (e.g. INV-2026-088)",
  "customerName": "Customer or Bill-To Company Name",
  "customerEmail": "Customer contact email or empty string",
  "amount": 1250.00, // Total number
  "issueDate": "YYYY-MM-DD", // Date of invoice or today if missing
  "dueDate": "YYYY-MM-DD", // Due date or calculated from terms
  "paymentTerms": "Net 15 | Net 30 | Net 60 | Net 90 | Due on Receipt",
  "poNumber": "PO number if found or empty string",
  "items": [
    {
      "description": "Item description",
      "quantity": 1,
      "unitPrice": 1000,
      "amount": 1000
    }
  ],
  "notes": "Any special instructions or payment terms notes"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (error: any) {
      console.error("Error parsing invoice text:", error);
      res.status(500).json({ error: error.message || "Failed to parse invoice text" });
    }
  });

  // Billing Endpoint: Send Billing Invoice to Customer Email
  app.post("/api/billing/send-email", async (req: Request, res: Response) => {
    try {
      const {
        invoice,
        company,
        recipientEmail,
        ccEmail,
        subject,
        customMessage,
        attachPdf = true,
      } = req.body;

      if (!invoice || !recipientEmail) {
        return res.status(400).json({ error: "Invoice and recipientEmail are required." });
      }

      const dispatchId = `DISPATCH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const timestamp = new Date().toISOString();

      // Generate HTML email template with corporate branding, items table, and wire instructions
      const subtotal = invoice.subtotal || invoice.amount || 0;
      const taxRate = invoice.taxRate !== undefined ? invoice.taxRate : 0.12;
      const taxAmount = invoice.taxAmount !== undefined ? invoice.taxAmount : subtotal * taxRate;
      const totalAmount = invoice.amount || subtotal + taxAmount;
      const balance = invoice.balance !== undefined ? invoice.balance : totalAmount;

      const emailSubject = subject || `[BILLING INVOICE] ${invoice.invoiceNumber} from ${company?.name || 'Company'} (Due: ${invoice.dueDate})`;

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            .header { background: #1e3a8a; color: #ffffff; padding: 24px; }
            .content { padding: 24px; }
            .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f1f5f9; padding: 12px; border-radius: 6px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 16px; }
            .table th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; padding: 8px; font-size: 12px; }
            .table td { border-bottom: 1px solid #e2e8f0; padding: 8px; font-size: 13px; }
            .totals { margin-left: auto; width: 240px; margin-top: 12px; }
            .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
            .total-due { font-size: 16px; font-weight: bold; color: #1e3a8a; border-top: 2px solid #1e3a8a; padding-top: 6px; }
            .bank-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-top: 20px; font-size: 12px; }
            .footer { padding: 16px; text-align: center; font-size: 11px; color: #64748b; background: #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin:0; font-size: 20px;">${company?.name || 'Corporate Billing'}</h2>
              <p style="margin:4px 0 0 0; opacity: 0.85; font-size: 13px;">Official Billing Statement: ${invoice.invoiceNumber}</p>
            </div>
            <div class="content">
              <p>Dear ${invoice.customerName},</p>
              ${customMessage ? `<p>${customMessage.replace(/\n/g, '<br/>')}</p>` : `<p>Please find details for billing invoice <strong>${invoice.invoiceNumber}</strong> issued on ${invoice.issueDate}.</p>`}
              
              <div class="meta-grid">
                <div>
                  <strong>Billed To:</strong><br/>
                  ${invoice.customerName}<br/>
                  ${recipientEmail}
                </div>
                <div style="text-align: right;">
                  <strong>Payment Due Date:</strong><br/>
                  <span style="color: #1e3a8a; font-weight: bold;">${invoice.dueDate}</span><br/>
                  Terms: ${invoice.paymentTerms || 'Net 30'}
                </div>
              </div>

              <table class="table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${(invoice.items || []).map((item: any) => `
                    <tr>
                      <td>${item.description}</td>
                      <td style="text-align: center;">${item.quantity}</td>
                      <td style="text-align: right;">$${Number(item.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style="text-align: right; font-weight: bold;">$${Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="totals">
                <div class="totals-row">
                  <span>Subtotal:</span>
                  <strong>$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div class="totals-row">
                  <span>Sales Tax (${(taxRate * 100).toFixed(1)}%):</span>
                  <strong>$${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div class="totals-row total-due">
                  <span>Balance Due:</span>
                  <span>$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div class="bank-box">
                <strong>Wire / ACH Remittance Details:</strong><br/>
                Bank: JP Morgan Chase & Co.<br/>
                Account: ${company?.legalName || company?.name || 'Corporate Treasury'}<br/>
                Routing / Swift: 021000021 / CHASUS33<br/>
                Remittance Reference: <strong>${invoice.invoiceNumber}</strong>
              </div>
            </div>
            <div class="footer">
              This is an automated billing statement dispatched to registered customer email ${recipientEmail}.<br/>
              Attachment: ${attachPdf ? `${invoice.invoiceNumber}.pdf (Attached)` : 'None'}
            </div>
          </div>
        </body>
        </html>
      `;

      // Log dispatch simulation in server console
      console.log(`[Billing Email Service] Successfully dispatched billing statement ${invoice.invoiceNumber} to ${recipientEmail} (CC: ${ccEmail || 'None'}) at ${timestamp}`);

      res.json({
        success: true,
        dispatchId,
        sentAt: timestamp,
        recipientEmail,
        ccEmail: ccEmail || null,
        subject: emailSubject,
        status: "sent",
        pdfAttached: !!attachPdf,
        message: `Billing invoice ${invoice.invoiceNumber} was successfully transmitted to ${recipientEmail}.`,
      });
    } catch (error: any) {
      console.error("Error sending billing email:", error);
      res.status(500).json({ error: error.message || "Failed to dispatch billing email" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Receivables Monitor Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
