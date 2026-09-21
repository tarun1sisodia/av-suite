import React, { useState, useEffect } from 'react';
import { SlideOver } from '../../../components/ui/SlideOver';
import { useCreateUser } from '../api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: string;
}

export function AddUserSlideOver({ isOpen, onClose, defaultRole = 'front_desk' }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(defaultRole);

  const createUser = useCreateUser();

  useEffect(() => {
    if (isOpen) {
      setRole(defaultRole);
    }
  }, [isOpen, defaultRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createUser.isPending) return;
    try {
      await createUser.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        role,
      });
      toast.success('User created successfully');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setRole(defaultRole);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err?.message || 'Failed to create user');
    }
  };

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title="Add New User" subtitle="Create a new user account for your clinic" isProcessing={createUser.isPending}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
            <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
            <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password *</label>
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role *</label>
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm">
            <option value="admin">Admin</option>
            <option value="therapist">Therapist / Doctor</option>
            <option value="front_desk">Front Desk / Receptionist</option>
          </select>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium text-sm">Cancel</button>
          <button type="submit" disabled={createUser.isPending} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center gap-2">
            {createUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{createUser.isPending ? 'Creating...' : 'Create User'}</span>
          </button>
        </div>
      </form>
    </SlideOver>
  );
}
