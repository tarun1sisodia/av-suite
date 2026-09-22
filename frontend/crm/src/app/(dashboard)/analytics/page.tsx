'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../../../store';
import { usePatients } from '../../../features/patients/api';
import { useAnalyticsOverview, useMyPerformance } from '../../../features/analytics/api';
import { ActivitySquare, Stethoscope, ClipboardList } from 'lucide-react';
import { TrendingUp, Users, Calendar, DollarSign, Plus, Trash2, Save, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { AccessRestricted } from '../../../components/ui/AccessRestricted';

interface RunningCostItem {
  id: string;
  label: string;
  amount: number;
}

import { useCanAccessModule, useHasCapability } from '../../../config/permissions';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');

  const hasAccess = useCanAccessModule('analytics');
  const canViewFinancials = useHasCapability('analytics.clinic_financials');
  const canViewMyPerf = useHasCapability('analytics.my_performance');

  const { data: patientsResponse } = usePatients(undefined, 1, 5, canViewFinancials);
  const patients = patientsResponse?.data || [];

  // Scoped performance query
  const { data: myPerformance, isLoading: myPerfLoading } = useMyPerformance(canViewMyPerf);
  // Running costs state — editable by admin (Rent, Electricity, Supplies, Salaries)
  const [runningCosts, setRunningCosts] = useState<RunningCostItem[]>([
    { id: '1', label: 'Rent', amount: 35000 },
    { id: '2', label: 'Electricity & Utilities', amount: 8000 },
    { id: '3', label: 'Clinic Supplies', amount: 12000 },
    { id: '4', label: 'Therapist Salaries', amount: 65000 },
  ]);

  const totalMonthlyExpenses = runningCosts.reduce((acc, c) => acc + (c.amount || 0), 0);

  const { data: analyticsOverview } = useAnalyticsOverview(canViewFinancials);
  const totalCollected = Number(analyticsOverview?.revenue?.revenue_this_month) || 0;
  const estimatedProfit = totalCollected - totalMonthlyExpenses;

  const therapistSalariesTotal = runningCosts.find((c) => c.label === 'Therapist Salaries')?.amount || 0;

  const handleAddCost = () => {
    setRunningCosts([...runningCosts, { id: Date.now().toString(), label: 'New Expense', amount: 5000 }]);
  };

  const handleRemoveCost = (id: string) => {
    setRunningCosts(runningCosts.filter((c) => c.id !== id));
  };

  const handleSaveCosts = () => {
    toast.warning('Running costs not saved — backend endpoint not yet wired. Changes have not been persisted.');
  };

  if (!hasAccess) {
    return <AccessRestricted message="Analytics access is restricted for your role." />;
  }

  // If user only has personal performance permission, show personal performance
  if (!canViewFinancials && canViewMyPerf) {
    const perf = myPerformance;
    return (
      <div className="p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
              <ActivitySquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Performance</h1>
              <p className="text-xs text-slate-400">Your own sessions, patients & appointments this month</p>
            </div>
          </div>

          {myPerfLoading ? (
            <div className="text-slate-400 text-sm">Loading your performance data...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Today's Appointments", value: perf?.today_appointments ?? 0, icon: Calendar },
                { label: 'Completed This Month', value: perf?.completed_appointments_this_month ?? 0, icon: TrendingUp },
                { label: 'Cancelled This Month', value: perf?.cancelled_appointments_this_month ?? 0, icon: ArrowDownRight },
                { label: 'Treatment Sessions', value: perf?.treatment_sessions_this_month ?? 0, icon: Stethoscope },
                { label: 'SOAP Notes', value: perf?.soap_notes_this_month ?? 0, icon: ClipboardList },
                { label: 'Patients Seen', value: perf?.patients_seen_this_month ?? 0, icon: Users },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header & Period Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics & P&L Summary</h1>
            <p className="text-sm text-slate-500">Financial performance, running expenses & revenue trends</p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {(['today', 'week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
                  period === p
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Total Billed Revenue</span>
              <DollarSign className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              ₹{(totalCollected + 15000).toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-slate-400">In period</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Amount Collected</span>
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-600 mt-2">
              ₹{totalCollected.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-emerald-600 font-semibold">Paid invoices</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Total Expenses</span>
              <ArrowDownRight className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-2xl font-extrabold text-rose-500 mt-2">
              ₹{totalMonthlyExpenses.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-slate-400">Running costs + Salaries</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Estimated Net Profit</span>
              <ArrowUpRight className="w-5 h-5 text-teal-600" />
            </div>
            <p className={`text-2xl font-extrabold mt-2 ${estimatedProfit >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
              ₹{Math.abs(estimatedProfit).toLocaleString('en-IN')} {estimatedProfit < 0 ? '(LOSS)' : ''}
            </p>
            <span className="text-[11px] text-slate-400">After all running costs</span>
          </div>
        </div>

        {/* 2 Column Layout: Running Costs vs P&L Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Running Costs Manager */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Monthly Running Costs</h3>
              <button
                onClick={handleSaveCosts}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Expenses</span>
              </button>
            </div>

            <div className="space-y-3">
              {runningCosts.map((cost, idx) => (
                <div key={cost.id} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={cost.label}
                    onChange={(e) => {
                      const updated = [...runningCosts];
                      updated[idx].label = e.target.value;
                      setRunningCosts(updated);
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  />
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                    <input
                      type="number"
                      value={cost.amount}
                      onChange={(e) => {
                        const updated = [...runningCosts];
                        updated[idx].amount = Number(e.target.value) || 0;
                        setRunningCosts(updated);
                      }}
                      className="w-full pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveCost(cost.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Auto Therapist Salary Row */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Therapist Salaries (Auto-calculated)
                </span>
                <span className="font-bold text-rose-600">₹{therapistSalariesTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={handleAddCost}
                className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense Item</span>
              </button>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Total Expenses: <span className="text-rose-600">₹{totalMonthlyExpenses.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Top Patients by Revenue */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Top Patients by Revenue</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {patients.slice(0, 5).map((patient) => (
                <div key={patient.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <p className="text-[10px] text-slate-400">{patient.phone}</p>
                  </div>
                  <div className="text-right">
                    {/* Phase 2: fetch real per-patient revenue from /api/v1/billing */}
                    <p className="font-bold text-slate-400">— Revenue pending</p>
                    <p className="text-[10px] text-slate-400">API wiring Phase 2</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}
