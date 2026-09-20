'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  CreditCard,
  UserPlus,
  Stethoscope,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuthStore, useUiStore } from '../../store';
import { canAccessModule, ModuleVisibility } from '../../config/permissions';

interface NavItem {
  label: string;
  href: string;
  moduleKey: keyof ModuleVisibility;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', moduleKey: 'dashboard', icon: LayoutDashboard },
  { label: 'Patients', href: '/patients', moduleKey: 'patients', icon: Users },
  { label: 'Appointments', href: '/appointments', moduleKey: 'appointments', icon: Calendar },
  { label: 'Analytics', href: '/analytics', moduleKey: 'analytics', icon: BarChart3 },
  { label: 'Billing', href: '/billing', moduleKey: 'billing', icon: CreditCard },
  { label: 'Leads', href: '/leads', moduleKey: 'leads', icon: UserPlus },
  { label: 'Therapists', href: '/therapists', moduleKey: 'therapists', icon: Stethoscope },
  { label: 'Recycle Bin', href: '/recycle-bin', moduleKey: 'recycleBin', icon: Trash2 },
  { label: 'Settings', href: '/settings', moduleKey: 'settings', icon: Settings },
];

export function SidebarNavigation() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const clinic = useAuthStore((s) => s.clinic);
  const logout = useAuthStore((s) => s.logout);
  const { isSidebarOpen, toggleSidebar } = useUiStore();

  const effectiveClinic = clinic;
  const visibleItems = NAV_ITEMS.filter((item) => canAccessModule(item.moduleKey));

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-30 flex flex-col bg-[var(--brand-navy)] text-white transition-[width] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
        isSidebarOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* Header / Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/10 overflow-hidden">
        {isSidebarOpen ? (
          effectiveClinic?.branding_logo_url ? (
            <img src={effectiveClinic.branding_logo_url} alt="Clinic Logo" className="max-h-8 max-w-[140px] object-contain" />
          ) : (
            <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap overflow-hidden text-ellipsis">
              {effectiveClinic?.name || 'AV Suite CRM'}
            </span>
          )
        ) : (
          effectiveClinic?.branding_logo_url ? (
            <img src={effectiveClinic.branding_logo_url} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <span className="text-lg font-bold text-teal-400">
              {effectiveClinic?.name?.[0]?.toUpperCase() || 'AV'}
            </span>
          )
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Role Badge */}
      {isSidebarOpen && (
        <div className="px-4 py-2 border-b border-white/5 bg-white/5">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
            Role: <span className="text-teal-300">{role ? role.replace('_', ' ') : 'Unknown'}</span>
          </p>
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
              title={!isSidebarOpen ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={() => {
            logout();
            window.location.replace('/login');
          }}
          className="btn-press w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
          title={!isSidebarOpen ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isSidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
