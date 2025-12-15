'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useSubscription } from '@/hooks/use-subscription';
import { BarChart3, TrendingUp, Clock, Zap, Calendar, Target } from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface AdditionalStats {
  todayQueries: number;
  totalQueries: number;
  avgConfidence: number;
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  // Koristi ISTI hook kao klasifikator za usage podatke
  const { remainingQueries, monthlyLimit, usedThisMonth, loading: usageLoading } = useSubscription();
  const [additionalStats, setAdditionalStats] = useState<AdditionalStats | null>(null);
  const [_isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAdditionalStats = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE}/users/me/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAdditionalStats({
              todayQueries: data.data.todayQueries || 0,
              totalQueries: data.data.totalQueries || 0,
              avgConfidence: data.data.avgConfidence || 0,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdditionalStats();
  }, [token]);

  // Calculate usage percentage based on monthly limit (from useSubscription)
  const usagePercent = monthlyLimit > 0
    ? (usedThisMonth / monthlyLimit) * 100
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="kpd-heading-2">
          Dobrodošli, {user?.firstName || 'Korisnik'}!
        </h1>
        <p className="kpd-text-body kpd-mt-sm">
          Pregled vašeg korištenja AI KPD Klasifikatora.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Queries */}
        <div className="kpd-settings-card">
          <div className="kpd-settings-card__body">
            <div className="flex items-center gap-4">
              <div className="kpd-feature-card__icon">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="kpd-text-small">Danas</p>
                <p className="kpd-heading-3">{additionalStats?.todayQueries ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* This Month - koristi useSubscription podatke (isti izvor kao klasifikator) */}
        <div className="kpd-settings-card">
          <div className="kpd-settings-card__body">
            <div className="flex items-center gap-4">
              <div className="kpd-feature-card__icon">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="kpd-text-small">Ovaj mjesec</p>
                <p className="kpd-heading-3">{usageLoading ? '...' : usedThisMonth}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Total Queries */}
        <div className="kpd-settings-card">
          <div className="kpd-settings-card__body">
            <div className="flex items-center gap-4">
              <div className="kpd-feature-card__icon">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="kpd-text-small">Ukupno</p>
                <p className="kpd-heading-3">{additionalStats?.totalQueries ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Avg Confidence */}
        <div className="kpd-settings-card">
          <div className="kpd-settings-card__body">
            <div className="flex items-center gap-4">
              <div className="kpd-feature-card__icon">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="kpd-text-small">Prosj. pouzdanost</p>
                <p className="kpd-heading-3">
                  {(additionalStats?.avgConfidence ?? 0) > 0 ? `${additionalStats?.avgConfidence}%` : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Card - koristi useSubscription podatke (isti izvor kao klasifikator) */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="kpd-heading-3">Mjesečno korištenje</h2>
            <p className="kpd-text-small">
              Preostalo {usageLoading ? '...' : remainingQueries} od {monthlyLimit} upita
            </p>
          </div>
        </div>
        <div className="kpd-settings-card__body">
          {/* Progress Bar */}
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(usagePercent, 100)}%`,
                backgroundColor: usagePercent > 80 ? 'var(--error)' : usagePercent > 50 ? 'var(--warning)' : 'var(--primary-500)'
              }}
            />
          </div>
          <p className="kpd-text-small kpd-mt-lg">
            Iskorišteno {Math.round(usagePercent)}% mjesečnog limita
          </p>
        </div>
        <div className="kpd-settings-card__footer">
          <Link href="/settings/billing" className="kpd-btn kpd-btn--secondary kpd-btn--sm">
            Nadogradi plan
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="kpd-heading-3">Brze akcije</h2>
            <p className="kpd-text-small">Česte radnje na jednom mjestu</p>
          </div>
        </div>
        <div className="kpd-settings-card__body">
          <div className="flex flex-wrap gap-3">
            <Link href="/classify" className="kpd-btn kpd-btn--primary">
              Nova klasifikacija
            </Link>
            <Link href="/history" className="kpd-btn kpd-btn--secondary">
              Povijest upita
            </Link>
            <Link href="/settings" className="kpd-btn kpd-btn--ghost">
              Postavke profila
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
