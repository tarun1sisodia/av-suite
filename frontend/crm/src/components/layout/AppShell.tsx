'use client';

import React from 'react';
import { SidebarNavigation } from './SidebarNavigation';
import { CommandBar } from './CommandBar';
import { AuthGuard } from '../auth/AuthGuard';
import { useUiStore, useAuthStore } from '../../store';
import { Search } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const clinic = useAuthStore((s) => s.clinic);
  const effectiveClinic = clinic;

  React.useEffect(() => {
    if (effectiveClinic?.branding_color) {
      document.documentElement.style.setProperty('--brand-navy', effectiveClinic.branding_color);
      document.documentElement.style.setProperty('--sidebar-bg', effectiveClinic.branding_color);
      document.documentElement.style.setProperty('--primary', effectiveClinic.branding_color);
    }
  }, [effectiveClinic?.branding_color]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
        {/* Sidebar */}
        <SidebarNavigation />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
            isSidebarOpen ? 'pl-64' : 'pl-16'
          }`}
        >
          {/* Top Header */}
          <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                  window.dispatchEvent(event);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-500 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search patients or run commands...</span>
                <kbd className="ml-4 px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border text-[10px] font-mono">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {effectiveClinic?.branding_logo_url && (
                <img
                  src={effectiveClinic.branding_logo_url}
                  alt="Clinic Logo"
                  className="h-7 w-auto max-w-[120px] object-contain rounded"
                />
              )}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                {effectiveClinic?.name || 'Aarogya Clinic'}
              </span>
            </div>
          </header>


          {/* Page Body */}
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>

        {/* Global Cmd+K CommandBar */}
        <CommandBar />
      </div>
    </AuthGuard>
  );
}
