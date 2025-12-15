'use client';

import { useState } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { UserSidebar } from './user-sidebar';
import { ImpersonationBanner } from './admin/impersonation-banner';
import { useAuth } from '@/contexts/auth-context';
import { useIsAdmin } from '@/lib/hooks/use-is-admin';
import { Menu, X, User, ChevronDown, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayoutClient({ children }: DashboardLayoutProps) {
  const { isAdmin, isLoading } = useIsAdmin();
  const { user, logout, impersonation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const isImpersonating = impersonation?.isImpersonating || false;

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // ADMIN LAYOUT: Full sidebar with all options (unchanged)
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Fixed sidebar */}
        <div className="fixed left-0 top-0 bottom-0 w-64 z-40">
          <AdminSidebar />
        </div>

        {/* Main content area */}
        <div className="flex-1 ml-64">
          {/* Top bar for admin */}
          <header className="bg-white border-b h-16 sticky top-0 z-30 shadow-sm">
            <div className="h-full px-6 flex items-center justify-end">
              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {user?.firstName || 'Admin'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border py-2 z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link
                      href="/settings/profile"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      Postavke
                    </Link>
                    <button
                      onClick={() => logout()}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                    >
                      <LogOut className="w-4 h-4 text-gray-400" />
                      Odjava
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // REGULAR USER LAYOUT: Sidebar + Content
  return (
    <div className={`kpd-app-layout ${isImpersonating ? 'pt-12' : ''}`}>
      {/* Impersonation Banner */}
      <ImpersonationBanner />

      {/* Desktop Sidebar - fixed */}
      <div className={`kpd-app-layout__sidebar ${isImpersonating ? 'top-12' : ''}`}>
        <UserSidebar />
      </div>

      {/* Mobile header */}
      <header className="kpd-app-layout__mobile-header">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="kpd-app-layout__menu-button"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <span className="kpd-app-layout__mobile-title">KPD Klasifikator</span>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="kpd-app-layout__overlay"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="kpd-app-layout__mobile-sidebar">
            <UserSidebar />
          </div>
        </>
      )}

      {/* Main content area */}
      <main className="kpd-app-layout__main">
        <div className="kpd-app-layout__content">
          {children}
        </div>
      </main>
    </div>
  );
}

// Alias for backwards compatibility
export const DashboardLayout = DashboardLayoutClient;
