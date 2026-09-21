'use client';

import React from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { Users, Calendar, DollarSign, UserCheck, Loader2, Stethoscope, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useAnalyticsOverview, useMyPerformance } from '../../../features/analytics/api';
import { useAppointments } from '../../../features/appointments/api';
import { useLeads } from '../../../features/leads/api';
import { usePatients } from '../../../features/patients/api';
import { useAuthStore } from '../../../store';
import { useCanAccessModule, useHasCapability } from '../../../config/permissions';
import { AccessRestricted } from '../../../components/ui/AccessRestricted';
import { MotionPage, MotionCardGrid, MotionCard, MotionStat, MotionFadeIn } from '../../../components/motion';

export default function DashboardPage() {
  const isAllowed = useCanAccessModule('dashboard');
  const canViewFinancials = useHasCapability('analytics.clinic_financials');
  const canViewMyPerf = useHasCapability('analytics.my_performance');
  const canViewAppts = useHasCapability('appointments.view');
  const canViewLeads = useHasCapability('leads.view');
  const canViewPatients = useHasCapability('patients.view');

  const hasAnyDashboardView = canViewFinancials || canViewMyPerf || canViewAppts || canViewLeads || canViewPatients;

  // Admin / financial overview query
  const { data: overview, isLoading: isOverviewLoading, isError: isOverviewError, error: overviewError } = useAnalyticsOverview(canViewFinancials);
  
  // Therapist personal clinical performance query
  const { data: myPerf, isLoading: isPerfLoading } = useMyPerformance(canViewMyPerf);

  // Operational queries
  const { data: appointmentsRes, isLoading: isApptsLoading } = useAppointments(undefined, undefined, 1, 50, canViewAppts);
  const { data: leads, isLoading: isLeadsLoading } = useLeads(undefined, canViewLeads);
  const { data: patientsRes, isLoading: isPatientsLoading } = usePatients(undefined, 1, 1, canViewPatients);

  if (!isAllowed) {
    return <AccessRestricted message="Dashboard access is restricted." />;
  }

  const isLoading = canViewFinancials 
    ? isOverviewLoading 
    : canViewMyPerf 
    ? isPerfLoading 
    : ((canViewAppts && isApptsLoading) || (canViewLeads && isLeadsLoading) || (canViewPatients && isPatientsLoading));

  const kpiCardClass = 'bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-shadow duration-200';

  return (
    <AppShell>
      <MotionPage className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back to Aarogya Virohan CRM
          </p>
        </div>

        {!hasAnyDashboardView ? (
          <MotionFadeIn>
            <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Module Permissions Assigned</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Your account currently has no active feature permissions. Please contact your clinic administrator to grant access to patients, appointments, analytics, or other clinic modules.
              </p>
            </div>
          </MotionFadeIn>
        ) : isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : canViewFinancials ? (

          isOverviewError ? (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-lg">
              Failed to load analytics: {(overviewError as any)?.message || 'Unknown error'}
            </div>
          ) : (
            /* Admin KPI Cards */
            <MotionCardGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MotionStat className={kpiCardClass}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Total Patients</span>
                  <Users className="w-5 h-5 text-teal-600" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {overview?.patients?.total_patients || 0}
                </p>
              </MotionStat>

              <MotionStat className={kpiCardClass}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Today&apos;s Appointments</span>
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {overview?.appointments?.today_appointments || 0}
                </p>
              </MotionStat>

              <MotionStat className={kpiCardClass}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Monthly Revenue</span>
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                  ₹{(overview?.revenue?.revenue_this_month || 0).toLocaleString('en-IN')}
                </p>
              </MotionStat>

              <MotionStat className={kpiCardClass}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Pending Leads</span>
                  <UserCheck className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {overview?.leads?.total_leads || 0}
                </p>
              </MotionStat>
            </MotionCardGrid>
          )
        ) : canViewMyPerf ? (
          /* Personal Clinical KPI Cards */
          <MotionCardGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MotionStat className={kpiCardClass}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">Today&apos;s Visits</span>
                <Calendar className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {myPerf?.today_appointments ?? 0}
              </p>
            </MotionStat>

            <MotionStat className={kpiCardClass}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">Completed This Month</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {myPerf?.completed_appointments_this_month ?? 0}
              </p>
            </MotionStat>

            <MotionStat className={kpiCardClass}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">Treatment Sessions</span>
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {myPerf?.treatment_sessions_this_month ?? 0}
              </p>
            </MotionStat>

            <MotionStat className={kpiCardClass}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">Patients Seen</span>
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {myPerf?.patients_seen_this_month ?? 0}
              </p>
            </MotionStat>
          </MotionCardGrid>
        ) : (
          /* Front Desk Operational KPI Cards */
          <MotionCardGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MotionStat className={kpiCardClass}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">Total Patients</span>
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {patientsRes?.meta?.total ?? 0}
              </p>
            </MotionStat>

            <MotionStat className={kpiCardClass}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">Scheduled Appointments</span>
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {appointmentsRes?.meta?.total ?? appointmentsRes?.data?.length ?? 0}
              </p>
            </MotionStat>

            <MotionStat className={kpiCardClass}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">Active Leads</span>
                <UserCheck className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {leads?.length ?? 0}
              </p>
            </MotionStat>

            <MotionCard className={kpiCardClass}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">System Status</span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-emerald-600 mt-2 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </p>
            </MotionCard>
          </MotionCardGrid>
        )}
      </MotionPage>
    </AppShell>
  );
}