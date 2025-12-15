'use client';

import { useAuth } from '@/contexts/auth-context';
import { UserCog, X, Shield, Clock } from 'lucide-react';

export function ImpersonationBanner() {
  const { user, impersonation } = useAuth();

  if (!impersonation.isImpersonating || !impersonation.originalUser) {
    return null;
  }

  const formatDuration = () => {
    if (!impersonation.impersonatedAt) return '';
    const start = new Date(impersonation.impersonatedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  const handleStopImpersonation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Direct localStorage manipulation as fallback for reliability
    const impersonationState = localStorage.getItem('kpd_impersonation');
    if (impersonationState) {
      try {
        const state = JSON.parse(impersonationState);
        if (state.originalToken) {
          localStorage.setItem('kpd_auth_token', state.originalToken);
          document.cookie = `kpd_auth_token=${state.originalToken}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
        }
      } catch (err) {
        console.error('Failed to parse impersonation state:', err);
      }
    }
    localStorage.removeItem('kpd_impersonation');

    // Force full page reload
    window.location.href = '/admin/users';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              <span className="font-semibold">IMPERSONACIJA AKTIVNA</span>
            </div>
            <div className="h-4 w-px bg-purple-400" />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-purple-200">Prijavljeni kao:</span>
              <span className="font-medium">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email}
              </span>
            </div>
            <div className="h-4 w-px bg-purple-400" />
            <div className="flex items-center gap-2 text-sm text-purple-200">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDuration()}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-purple-200">
              <Shield className="w-3.5 h-3.5" />
              <span>Master Admin:</span>
              <span className="font-medium text-white">{impersonation.originalUser.email}</span>
            </div>
            <button
              onClick={handleStopImpersonation}
              type="button"
              className="flex items-center gap-2 px-4 py-1.5 bg-white text-purple-700 rounded-lg font-medium text-sm hover:bg-purple-50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              Zaustavi impersonaciju
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
