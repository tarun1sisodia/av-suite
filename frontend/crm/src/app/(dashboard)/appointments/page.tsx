'use client';

import React, { useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { useAppointments, useUpdateAppointmentStatus } from '../../../features/appointments/api';
import { useClinicSettings } from '../../../features/settings/api';
import { AddAppointmentSlideOver } from '../../../features/appointments/components/AddAppointmentSlideOver';
import { RescheduleSlideOver } from '../../../features/appointments/components/RescheduleSlideOver';
import { WhatsAppButton } from '../../../components/ui/WhatsAppButton';
import { AppointmentStatus, Appointment } from '../../../types/api';
import { Plus, Calendar as CalendarIcon, Clock, User, CheckCircle2, XCircle, Copy, ExternalLink, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../store';
import { useCanAccessModule, useCanPerformAction, useHasCapability } from '../../../config/permissions';
import { AccessRestricted } from '../../../components/ui/AccessRestricted';

interface BookingRequest {
  id: string;
  name: string;
  phone: string;
  preferred_date: string;
  preferred_slot: string;
  chief_complaint: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

type SubTabKey = 'list' | 'requests' | 'bookingLink';

export default function AppointmentsPage() {
  const isAllowed = useCanAccessModule('appointments');
  const { data: appointmentsResponse, isLoading } = useAppointments(undefined, undefined, 1, 10, isAllowed);
  const appointments: Appointment[] = appointmentsResponse?.data || [];
  const updateStatus = useUpdateAppointmentStatus();

  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('list');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [requests, setRequests] = useState<BookingRequest[]>([]);

  const canManage = useCanPerformAction('manageAppointments');
  const canViewBookingRequests = useHasCapability('booking.view');
  const canApproveBookingRequests = useHasCapability('booking.approve');
  const canEditAppointments = useHasCapability('appointments.edit');

  // Fetch pending appointment requests from backend on mount (only for authorized roles)
  React.useEffect(() => {
    if (!canViewBookingRequests) return;
    const fetchRequests = async () => {
      try {
        const res = await apiClient.get('/appointment-requests');
        setRequests(res.data?.data || res.data || []);
      } catch {
        // If endpoint isn't live yet, stay empty rather than showing mock data
        setRequests([]);
      }
    };
    fetchRequests();
  }, [canViewBookingRequests]);

  // Clinic Settings for Booking Link
  const authClinic = useAuthStore((s) => s.clinic);
  const { data: clinicSettings } = useClinicSettings();
  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const clinicName = clinicSettings?.name || authClinic?.name || 'aarogya';
  const slug = generateSlug(clinicName);

  const defaultBookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/booking/${slug}` : `/booking/${slug}`;

  // Booking Link State
  const [bookingUrl, setBookingUrl] = useState(defaultBookingUrl);
  
  React.useEffect(() => {
    const name = clinicSettings?.name || authClinic?.name;
    if (name && typeof window !== 'undefined') {
       const newUrl = `${window.location.origin}/booking/${generateSlug(name)}`;
       setBookingUrl(newUrl);
       localStorage.setItem('av_crm_booking_url', newUrl);
    }
  }, [clinicSettings?.name, authClinic?.name]);
  const [showQr, setShowQr] = useState(false);

  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    return true;
  });

  if (!isAllowed) {
    return <AccessRestricted message="Appointments access is restricted for your role." />;
  }

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      toast.success('Appointment status updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const handleApproveRequest = async (req: BookingRequest) => {
    try {
      const userId = useAuthStore.getState().userId;
      await apiClient.post(`/appointment-requests/${req.id}/approve`, {
        therapist_id: userId || undefined,
        duration_minutes: 30,
      });

      // Refetch requests from backend to reflect actual state
      const res = await apiClient.get('/appointment-requests');
      setRequests(res.data?.data || res.data || []);
      toast.success(`Request approved! Appointment created for ${req.name}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (req: BookingRequest) => {
    try {
      await apiClient.post(`/appointment-requests/${req.id}/reject`);

      // Refetch requests from backend to reflect actual state
      const res = await apiClient.get('/appointment-requests');
      setRequests(res.data?.data || res.data || []);
      toast.success(`Request rejected`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to reject request');
    }
  };

  const handleSaveBookingUrl = (url: string) => {
    // URL is now read-only and dynamically generated based on clinic name
  };

  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Appointments & Bookings</h1>
            <p className="text-sm text-slate-500">Manage daily schedules & incoming public booking requests</p>
          </div>

          {canManage && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Book Visit</span>
            </button>
          )}
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveSubTab('list')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'list'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Appointments Schedule</span>
          </button>

          {canViewBookingRequests && (
            <button
              onClick={() => setActiveSubTab('requests')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'requests'
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Pending Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('bookingLink')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'bookingLink'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Public Booking Link & QR</span>
          </button>
        </div>

        {/* Sub-Tab 1: Appointments List */}
        {activeSubTab === 'list' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'scheduled' | 'completed' | 'cancelled')}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredAppointments.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-sm">
                  No appointments found.
                </div>
              ) : (
                filteredAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-teal-50 dark:bg-teal-950 text-teal-600 rounded-xl">
                        <CalendarIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {apt.patient_name || `Patient ID: ${apt.patient_id}`}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(apt.scheduled_at).toLocaleString()} ({apt.duration_minutes} mins)
                          </span>
                          <span>•</span>
                          <span className="capitalize text-teal-600 font-semibold">{apt.appointment_type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      {canEditAppointments && (
                        <button
                          onClick={() => setRescheduleAppointment(apt)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Reschedule</span>
                        </button>
                      )}
                      {canEditAppointments && (
                        <select
                          value={apt.status}
                          onChange={(e) => handleStatusChange(apt.id, e.target.value as AppointmentStatus)}
                          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold uppercase text-slate-700 dark:text-slate-200"
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no_show">No Show</option>
                        </select>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Sub-Tab 2: Pending Booking Requests */}
        {activeSubTab === 'requests' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Incoming appointment requests from the public booking form. Approving auto-creates confirmed appointment & patient records.
            </p>

            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-sm">
                  No public booking requests found.
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {req.name}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            req.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span>Phone: <strong>{req.phone}</strong></span>
                        <WhatsAppButton phone={req.phone} name={req.name} />
                        <span>•</span>
                        <span>Service: <strong>{req.notes ? req.notes.replace('Service Requested: ', '') : 'Consultation'}</strong></span>
                        <span>•</span>
                        <span>Slot: <strong>{req.preferred_date} at {req.preferred_slot}</strong></span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        <strong>Complaint:</strong> {req.chief_complaint}
                      </p>
                    </div>

                    {req.status === 'pending' && canApproveBookingRequests && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRejectRequest(req)}
                          className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApproveRequest(req)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Book</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Sub-Tab 3: Public Booking Link & QR Code */}
        {activeSubTab === 'bookingLink' && (
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-6 max-w-2xl">
            <div className="bg-gradient-to-r from-navy to-blue-700 p-6 rounded-xl text-white space-y-4 shadow-md">
              <h3 className="text-lg font-bold">Public Appointment Booking Link</h3>
              <p className="text-xs text-slate-200">
                Share this URL with patients on WhatsApp, Instagram bio, or print the QR Code for your clinic reception.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bookingUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-xs text-white placeholder-slate-300 focus:outline-none cursor-not-allowed opacity-90"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(bookingUrl);
                    toast.success('Booking link copied to clipboard!');
                  }}
                  className="px-3.5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </a>
              </div>
            </div>

            {/* QR Code Action */}
            <div className="space-y-4">
              <button
                onClick={() => setShowQr((prev) => !prev)}
                className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>{showQr ? 'Hide QR Code' : 'Generate & Display QR Code'}</span>
              </button>

              {showQr && (
                <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-6">
                  <div className="w-32 h-32 bg-white p-2 rounded-lg border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-800 text-center shadow-xs">
                    <QRCodeCanvas value={bookingUrl} size={110} />
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Scan to Book</p>
                    <p>Patients can scan this QR code with their mobile cameras to launch the public booking form directly.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Appointment Drawer */}
        <AddAppointmentSlideOver isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
        
        {/* Reschedule Appointment Drawer */}
        <RescheduleSlideOver
          isOpen={!!rescheduleAppointment}
          onClose={() => setRescheduleAppointment(null)}
          appointment={rescheduleAppointment}
        />
      </div>
    </AppShell>
  );
}
