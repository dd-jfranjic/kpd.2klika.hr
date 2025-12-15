'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { DashboardLayoutClient } from '@/components/dashboard-layout';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [loading, token, router]);

  // Loading state
  if (loading) {
    return (
      <div className="kpd-page">
        <div className="kpd-auth-layout">
          <div className="kpd-auth-card__loading">
            <div className="kpd-auth-card__spinner">
              <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <span className="kpd-text-body">Učitavanje...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - will redirect
  if (!token) {
    return null;
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
