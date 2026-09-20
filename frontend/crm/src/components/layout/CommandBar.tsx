'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Command, X, Users, Calendar, Plus, CreditCard } from 'lucide-react';
import { usePatients } from '../../features/patients/api';

export function CommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { data: response } = usePatients(search, 1, 5, isOpen);
  const filteredPatients = response?.data || [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const navigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="modal-backdrop z-50">
      <div className="modal-card max-w-xl w-full p-4 bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-800">
        {/* Search Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients by name or phone, or run commands... (Esc to close)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none text-slate-800 dark:text-slate-100"
            autoFocus
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command Options / Results */}
        <div className="py-3 max-h-80 overflow-y-auto space-y-4">
          {/* Quick Actions */}
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 px-2 mb-1">
              Quick Actions
            </p>
            <div className="space-y-1">
              <button
                onClick={() => navigate('/patients')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span>Go to Patient Directory</span>
              </button>
              <button
                onClick={() => navigate('/appointments')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Go to Appointments Calendar</span>
              </button>
              <button
                onClick={() => navigate('/billing')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Go to Billing & Invoices</span>
              </button>
            </div>
          </div>

          {/* Patients Search Results */}
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 px-2 mb-1">
              Patients ({filteredPatients.length})
            </p>
            <div className="space-y-1">
              {filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {patient.first_name} {patient.last_name}
                    </span>
                    <span className="text-xs text-slate-400">({patient.phone})</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                    {patient.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Hint */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border">⌘K</kbd> anywhere to open search</span>
          <span>Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border">Esc</kbd> to exit</span>
        </div>
      </div>
    </div>
  );
}
