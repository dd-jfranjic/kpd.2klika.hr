'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface SubscriptionData {
  plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  status: string;
  dailyQueryLimit: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  planConfig?: {
    displayName: string;
    monthlyPriceEur: number;
    features: string[];
  };
}

interface UsageData {
  remainingQueries: number;
  monthlyLimit: number;
  usedThisMonth: number;
}

const planDisplayNames: Record<string, string> = {
  FREE: 'Besplatni',
  BASIC: 'Basic',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

export function useSubscription() {
  const { user, token, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user?.organizationId || !token) {
      setSubscription({
        plan: 'FREE',
        status: 'ACTIVE',
        dailyQueryLimit: 5,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
      setUsage({
        remainingQueries: 5,
        monthlyLimit: 5,
        usedThisMonth: 0,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch subscription and usage in parallel
      const [subResponse, usageResponse] = await Promise.all([
        fetch(`${API_BASE}/stripe/subscription/${user.organizationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE}/kpd/usage`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      // Process subscription
      if (subResponse.ok) {
        const data = await subResponse.json();
        setSubscription(data.subscription);
      } else {
        // Default to free plan
        setSubscription({
          plan: 'FREE',
          status: 'ACTIVE',
          dailyQueryLimit: 5,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        });
      }

      // Process usage - get actual remaining queries from backend
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        if (usageData.success && usageData.data) {
          // Use remaining directly from backend (already calculated correctly)
          setUsage({
            remainingQueries: usageData.data.remaining,
            monthlyLimit: usageData.data.limit,
            usedThisMonth: usageData.data.thisMonth,
          });
        }
      } else {
        // Fallback to subscription monthly limit if usage endpoint fails
        const subData = subResponse.ok ? await subResponse.clone().json() : null;
        const limit = subData?.subscription?.monthlyQueryLimit || 5;
        setUsage({
          remainingQueries: limit,
          monthlyLimit: limit,
          usedThisMonth: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Greška pri učitavanju pretplate');
      // Default to free plan on error
      setSubscription({
        plan: 'FREE',
        status: 'ACTIVE',
        dailyQueryLimit: 5,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    if (!authLoading) {
      fetchSubscription();
    }
  }, [authLoading, fetchSubscription]);

  // Method to update remaining queries (called after AI query)
  const updateRemainingQueries = useCallback((remaining: number) => {
    setUsage((prev) => prev ? {
      ...prev,
      remainingQueries: remaining,
      usedThisMonth: prev.monthlyLimit - remaining,
    } : null);
  }, []);

  const planName = subscription?.planConfig?.displayName ||
    planDisplayNames[subscription?.plan || 'FREE'] ||
    'Besplatni';

  return {
    subscription,
    usage,
    loading: authLoading || loading,
    error,
    planName,
    remainingQueries: usage?.remainingQueries ?? 0,
    monthlyLimit: usage?.monthlyLimit ?? 5,
    usedThisMonth: usage?.usedThisMonth ?? 0,
    updateRemainingQueries,
    refetch: fetchSubscription,
  };
}
