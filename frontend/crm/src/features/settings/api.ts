import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../store';

export interface ClinicSettings {
  id: string;
  name: string;
  branding_logo_url: string | null;
  branding_color: string | null;
  plan_tier: string;
  is_partner_clinic: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicSettingsUpdate {
  name?: string | null;
  branding_logo_url?: string | null;
  branding_color?: string | null;
}

export const useClinicSettings = (enabled = true) => {
  return useQuery({
    queryKey: ['clinic-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/clinic');
      return (res.data?.data || res.data) as ClinicSettings;
    },
    enabled,
  });
};

export const useUpdateClinicSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: ClinicSettingsUpdate) => {
      const res = await apiClient.patch('/settings/clinic', values);
      return (res.data?.data || res.data) as ClinicSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-settings'] });
      useAuthStore.getState().fetchMe();
    },
  });
};
