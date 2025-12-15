'use client';

import { useAuth } from '@/contexts/auth-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  classifyApi,
  usageApi,
  billingApi,
  apiKeysApi,
  reportsApi,
  kpdApi,
} from '@/lib/api';
import { toast } from '@/components/ui/toaster';

// Classification hooks
export function useClassify() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { description: string; context?: string }) => {
      return classifyApi.classify(data, token || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (error: Error) => {
      toast.error('Greška pri klasifikaciji', error.message);
    },
  });
}

export function useClassificationHistory(page = 1, limit = 10) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['history', page, limit],
    queryFn: async () => {
      return classifyApi.getHistory({ page, limit }, token || undefined);
    },
  });
}

// Usage hooks
export function useUsageStats() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      return usageApi.getStats(token || undefined);
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useDailyUsage(days = 30) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['usage', 'daily', days],
    queryFn: async () => {
      return usageApi.getDailyUsage(days, token || undefined);
    },
  });
}

// Billing hooks
export function useSubscription() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      return billingApi.getSubscription(token || undefined);
    },
  });
}

export function useCreateCheckout() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async (priceId: string) => {
      return billingApi.createCheckout(priceId, token || undefined);
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast.error('Greška', error.message);
    },
  });
}

export function useBillingPortal() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async () => {
      return billingApi.getPortalUrl(token || undefined);
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
}

export function useInvoices() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      return billingApi.getInvoices(token || undefined);
    },
  });
}

// API Keys hooks
export function useApiKeys() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      return apiKeysApi.list(token || undefined);
    },
  });
}

export function useCreateApiKey() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; scopes?: string[] }) => {
      return apiKeysApi.create(data, token || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API ključ kreiran');
    },
    onError: (error: Error) => {
      toast.error('Greška', error.message);
    },
  });
}

export function useRevokeApiKey() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      return apiKeysApi.revoke(keyId, token || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API ključ opozvan');
    },
    onError: (error: Error) => {
      toast.error('Greška', error.message);
    },
  });
}

// Reports hooks
export function useDashboardStats() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      return reportsApi.getDashboard(token || undefined);
    },
  });
}

// KPD hooks
export function useKpdSearch(query: string) {
  return useQuery({
    queryKey: ['kpd', 'search', query],
    queryFn: () => kpdApi.search(query),
    enabled: query.length >= 2,
  });
}

export function useKpdCategories() {
  return useQuery({
    queryKey: ['kpd', 'categories'],
    queryFn: () => kpdApi.getCategories(),
  });
}
