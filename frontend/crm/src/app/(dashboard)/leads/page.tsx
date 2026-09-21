'use client';

import React, { useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { useLeads, useUpdateLeadStage, useConvertLead, useDeleteLead } from '../../../features/leads/api';
import { AddLeadSlideOver } from '../../../features/leads/components/AddLeadSlideOver';
import { Lead, LeadStage } from '../../../types/api';
import { Plus, UserCheck, Phone, Mail, Search, List, LayoutGrid, CalendarClock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../store';
import { useCanAccessModule, useHasCapability } from '../../../config/permissions';
import { AccessRestricted } from '../../../components/ui/AccessRestricted';

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'bg-blue-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-amber-500' },
  { key: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
  { key: 'converted', label: 'Converted', color: 'bg-emerald-500' },
  { key: 'lost', label: 'Lost', color: 'bg-slate-400' },
];

export default function LeadsPage() {
  const hasAccess = useCanAccessModule('leads');
  const canCreateLead = useHasCapability('leads.create');
  const canConvertLead = useHasCapability('leads.convert');
  const canEditLead = useHasCapability('leads.edit');
  const canDeleteLead = useHasCapability('leads.delete');

  const { data: leads = [], isLoading } = useLeads(undefined, hasAccess);
  const updateStage = useUpdateLeadStage();
  const convertLead = useConvertLead();
  const deleteLead = useDeleteLead();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  const handleConvert = async (leadId: string, leadName: string) => {
    if (convertLead.isPending) return;
    try {
      await convertLead.mutateAsync(leadId);
      toast.success(`Lead ${leadName} converted to Patient successfully!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || err?.message || 'Failed to convert lead');
    }
  };

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (!window.confirm(`Are you sure you want to delete lead "${leadName}"?`)) return;
    try {
      await deleteLead.mutateAsync(leadId);
      toast.success(`Lead ${leadName} deleted successfully`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete lead');
    }
  };

  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    try {
      await updateStage.mutateAsync({ id: leadId, stage: newStage });
      toast.success('Lead stage updated');
    } catch (err) {
      console.error(err);
    }
  };

  if (!hasAccess) {
    return (
      <AppShell>
        <AccessRestricted message="You do not have permission to view or manage leads." />
      </AppShell>
    );
  }

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.phone.includes(q) ||
      (lead.email && lead.email.toLowerCase().includes(q))
    );
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leads Pipeline</h1>
            <p className="text-sm text-slate-500">Track and convert prospective patients</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'kanban' 
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
            </div>

            {canCreateLead && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Lead</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : viewMode === 'list' ? (
          /* List View (Default) */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Lead</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stage</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                        No leads found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const currentStage = STAGES.find(s => s.key === lead.stage);
                      return (
                        <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold text-sm">
                                {lead.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-900 dark:text-white">{lead.name}</p>
                                <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                                  <CalendarClock className="w-3 h-3" />
                                  <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{lead.phone}</span>
                              </div>
                              {lead.email && (
                                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{lead.email}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 capitalize">
                              {lead.source || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={lead.stage}
                              onChange={(e) => handleStageChange(lead.id, e.target.value as LeadStage)}
                              disabled={!canEditLead || lead.stage === 'converted' || !!lead.converted_patient_id}
                              className="text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {STAGES.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                            {lead.stage !== 'converted' && !lead.converted_patient_id ? (
                              canConvertLead ? (
                                <button
                                  onClick={() => handleConvert(lead.id, lead.name)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Convert</span>
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No convert permission</span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-500 text-xs font-bold uppercase tracking-wider px-3 py-1.5">
                                <UserCheck className="w-3.5 h-3.5" />
                                Converted
                              </span>
                            )}
                            {canDeleteLead && (
                              <button
                                onClick={() => handleDeleteLead(lead.id, lead.name)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors cursor-pointer"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
        ) : (
          /* Kanban View */
          <div className="flex overflow-x-auto pb-4 gap-4 items-start snap-x w-full">
            {STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.stage === stage.key);
              return (
                <div
                  key={stage.key}
                  className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-3 min-h-[500px] min-w-[280px] sm:min-w-[320px] flex-shrink-0 snap-start flex flex-col"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 px-1">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3 h-3 rounded-full ${stage.color} shadow-sm`} />
                      <span className="font-bold text-sm tracking-wide text-slate-800 dark:text-slate-100">
                        {stage.label}
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Lead Cards */}
                  <div className="space-y-3 flex-1">
                    {stageLeads.length === 0 ? (
                      <div className="h-full min-h-[100px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center p-4">
                        <span className="text-xs font-medium text-slate-400 text-center">No leads in this stage</span>
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow space-y-3 group"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{lead.name}</p>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                                {lead.source || 'Unknown Source'}
                              </p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          
                          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-medium">{lead.phone}</span>
                            </div>
                            {lead.email && (
                              <div className="flex items-center gap-2 truncate">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{lead.email}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-1 flex items-center justify-between gap-2">
                            <select
                              value={lead.stage}
                              onChange={(e) => handleStageChange(lead.id, e.target.value as LeadStage)}
                              disabled={!canEditLead || lead.stage === 'converted' || !!lead.converted_patient_id}
                              className="flex-1 text-[11px] font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1.5 text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {STAGES.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>

                            {lead.stage !== 'converted' && !lead.converted_patient_id && canConvertLead && (
                              <button
                                onClick={() => handleConvert(lead.id, lead.name)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors border border-emerald-200 dark:border-emerald-800/50"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Convert</span>
                              </button>
                            )}
                            {canDeleteLead && (
                              <button
                                onClick={() => handleDeleteLead(lead.id, lead.name)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors cursor-pointer"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Lead Drawer */}
        <AddLeadSlideOver isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      </div>
    </AppShell>
  );
}
