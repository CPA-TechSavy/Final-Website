import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  ShieldCheck,
  Info,
  Clock,
  ArrowUpRight,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
  Edit3,
  Check,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useReceivables } from '../context/ReceivablesContext';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

export const CashFlowForecastView: React.FC = () => {
  const {
    cashFlowProjections,
    kpis,
    currentCompany,
    isForecastCleared,
    clearCashForecast,
    resetCashForecast,
    updateCustomForecastOverride,
    customForecastOverrides,
  } = useReceivables();

  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [overrideInput, setOverrideInput] = useState<{
    expected: number;
    conservative: number;
    optimistic: number;
  }>({ expected: 0, conservative: 0, optimistic: 0 });

  const currencySymbol = getCurrencySymbol(currentCompany);

  const totalExpected30Days = cashFlowProjections.slice(0, 4).reduce((s, p) => s + p.expectedAmount, 0);
  const totalOptimistic30Days = cashFlowProjections.slice(0, 4).reduce((s, p) => s + p.optimisticAmount, 0);
  const totalConservative30Days = cashFlowProjections.slice(0, 4).reduce((s, p) => s + p.conservativeAmount, 0);

  const handleStartEdit = (p: typeof cashFlowProjections[0]) => {
    setEditingPeriod(p.period);
    setOverrideInput({
      expected: p.expectedAmount,
      conservative: p.conservativeAmount,
      optimistic: p.optimisticAmount,
    });
  };

  const handleSaveEdit = (period: string) => {
    updateCustomForecastOverride(period, overrideInput);
    setEditingPeriod(null);
  };

  const exportForecastToExcel = () => {
    const wb = XLSX.utils.book_new();

    const data = [
      ['ACCOUNTS RECEIVABLE CASH INFLOW FORECAST PROJECTION SCHEDULE'],
      ['Company / Entity:', currentCompany.name, 'Currency:', currentCompany.currency],
      ['Generated On:', new Date().toLocaleString()],
      ['Status:', isForecastCleared ? 'Manual / Cleared Overrides Active' : 'Automated Historical DSO Trajectory'],
      [],
      ['Forecast Period', 'Accounts / Invoices Due', `Conservative (${currentCompany.currency})`, `Expected Base Case (${currentCompany.currency})`, `Optimistic (${currentCompany.currency})`],
      ...cashFlowProjections.map((p) => [
        p.period,
        p.invoicesDueCount,
        p.conservativeAmount,
        p.expectedAmount,
        p.optimisticAmount,
      ]),
      [],
      [
        'TOTAL 90-DAY FORECAST INFLOW',
        cashFlowProjections.reduce((s, p) => s + p.invoicesDueCount, 0),
        cashFlowProjections.reduce((s, p) => s + p.conservativeAmount, 0),
        cashFlowProjections.reduce((s, p) => s + p.expectedAmount, 0),
        cashFlowProjections.reduce((s, p) => s + p.optimisticAmount, 0),
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 24 },
      { wch: 24 },
      { wch: 26 },
      { wch: 30 },
      { wch: 26 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Forecast');

    const cleanName = currentCompany.name.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `AR_Cash_Inflow_Forecast_${cleanName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Accounts Receivable Cash Inflow Forecast
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              {currentCompany.currency} ({currencySymbol})
            </span>
            {isForecastCleared && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Forecast Cleared / Custom Overrides
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Probabilistic 90-day cash recovery forecast weighted by debtor payment history & contractual due dates
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {isForecastCleared ? (
            <button
              onClick={resetCashForecast}
              className="px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[36px]"
              title="Restore automated AR contractual cash projections"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Auto Forecast</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all encoded cash forecast projections? You can restore them anytime.')) {
                  clearCashForecast();
                }
              }}
              className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[36px]"
              title="Clear all encoded cash forecast projections"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear Forecast</span>
            </button>
          )}

          <button
            onClick={exportForecastToExcel}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs min-h-[36px]"
            title="Download Cash Inflow Forecast spreadsheet in standard format"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Forecast (Excel)</span>
          </button>
        </div>
      </div>

      {/* Scenario Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Conservative */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Conservative (80% Confidence)
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-slate-900 font-mono">
            {formatCurrency(totalConservative30Days, currentCompany)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Accounts for extended debtor grace delays & disputed items
          </p>
        </div>

        {/* Expected */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-xs font-bold uppercase tracking-wider">
              Expected Base Case (MTD)
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          </div>
          <div className="text-2xl font-extrabold mt-2 text-blue-950 font-mono">
            {formatCurrency(totalExpected30Days, currentCompany)}
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Standard historical fulfillment trajectory based on DSO {kpis.dsoDays}d
          </p>
        </div>

        {/* Optimistic */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Optimistic (Prompt Pay)
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-emerald-700 font-mono">
            {formatCurrency(totalOptimistic30Days, currentCompany)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Assumes 100% on-time settlement of current active billings
          </p>
        </div>
      </div>

      {/* Main Forecast Chart */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">90-Day Cash Collection Forecast Projection</h3>
            <p className="text-xs text-slate-500">Weekly and monthly scheduled expected cash receipts in {currentCompany.currency} ({currencySymbol})</p>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlowProjections} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `${currencySymbol}${(val / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val), currentCompany), '']}
                contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="conservativeAmount" name="Conservative" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expectedAmount" name="Expected Base" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="optimisticAmount" name="Optimistic" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Table with Manual Inflow Override Support */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Weekly Forecast Schedule & Manual Overrides</h3>
            <p className="text-xs text-slate-500">View or manually encode forecasted inflow per period.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4 text-center">Invoices Due</th>
                <th className="py-3 px-4 text-right">Conservative ({currencySymbol})</th>
                <th className="py-3 px-4 text-right font-bold text-blue-900">Expected Base ({currencySymbol})</th>
                <th className="py-3 px-4 text-right">Optimistic ({currencySymbol})</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {cashFlowProjections.map((p, idx) => {
                const isEditing = editingPeriod === p.period;

                if (isEditing) {
                  return (
                    <tr key={idx} className="bg-blue-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.period}</td>
                      <td className="py-3 px-4 text-center text-slate-600">{p.invoicesDueCount} accounts</td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          value={overrideInput.conservative}
                          onChange={(e) => setOverrideInput({ ...overrideInput, conservative: Number(e.target.value) })}
                          className="w-28 text-right px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          value={overrideInput.expected}
                          onChange={(e) => setOverrideInput({ ...overrideInput, expected: Number(e.target.value) })}
                          className="w-28 text-right px-2 py-1 border border-blue-400 rounded font-mono text-xs font-bold text-blue-800"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          value={overrideInput.optimistic}
                          onChange={(e) => setOverrideInput({ ...overrideInput, optimistic: Number(e.target.value) })}
                          className="w-28 text-right px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSaveEdit(p.period)}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingPeriod(null)}
                            className="p-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer text-xs"
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.period}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{p.invoicesDueCount} accounts</td>
                    <td className="py-3 px-4 text-right text-amber-700 font-semibold font-mono">{formatCurrency(p.conservativeAmount, currentCompany)}</td>
                    <td className="py-3 px-4 text-right font-bold text-blue-700 font-mono">{formatCurrency(p.expectedAmount, currentCompany)}</td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-semibold font-mono">{formatCurrency(p.optimisticAmount, currentCompany)}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleStartEdit(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit forecast amounts for this period"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
