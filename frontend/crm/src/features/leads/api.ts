import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Lead, LeadStage } from '../../types/api';
import { LeadFormValues } from '../../lib/schemas';

export const LEADS_QUERY_KEY = ['leads'];

export function useLeads(stage?: LeadStage, enabled = true) {
  return useQuery<Lead[]>({
    queryKey: [...LEADS_QUERY_KEY, { stage }],
    queryFn: async () => {
      const res = await apiClient.get('/leads', {
        params: stage ? { stage } : undefined,
      });
      if (Array.isArray(res.data)) return res.data;
      if (res.data?.items && Array.isArray(res.data.items)) return res.data.items;
      if (res.data?.data) {
        if (Array.isArray(res.data.data)) return res.data.data;
        if (Array.isArray(res.data.data.items)) return res.data.data.items;
      }
      return [];
    },
    enabled,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: LeadFormValues) => {
      const res = await apiClient.post('/leads', values);
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
    },
  });
}

export function useUpdateLeadStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: LeadStage }) => {
      const res = await apiClient.patch(`/leads/${id}`, { stage });
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/leads/${id}/convert`);
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
    },
  });
}
