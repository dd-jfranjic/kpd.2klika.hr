'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { UserSidebar } from './user-sidebar';
import { ImpersonationBanner } from './admin/impersonation-banner';
import { useAuth } from '@/contexts/auth-context';
import { useIsAdmin } from '@/lib/hooks/use-is-admin';
import { User, ChevronDown, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { NotificationBell } from './notification-bell';
import { LoginPopup } from './login-popup';

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
        {/* Login Popup for notifications */}
        <LoginPopup />
        {/* Fixed sidebar */}
        <div className="fixed left-0 top-0 bottom-0 w-64 z-40">
          <AdminSidebar />
        </div>

        {/* Main content area */}
        <div className="flex-1 ml-64">
          {/* Top bar for admin */}
          <header className="bg-white border-b h-16 sticky top-0 z-30 shadow-sm">
            <div className="h-full px-6 flex items-center justify-end gap-4">
              {/* Notifications */}
              <NotificationBell />

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

  // Close mobile menu on escape key
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobileMenuOpen]);

  // Handle swipe-to-close on mobile
  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [handleEscapeKey]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // REGULAR USER LAYOUT: Sidebar + Content
  return (
    <div className={`kpd-app-layout ${isImpersonating ? 'pt-12' : ''}`}>
      {/* Login Popup for notifications */}
      <LoginPopup />

      {/* Impersonation Banner */}
      <ImpersonationBanner />

      {/* Desktop Sidebar - fixed */}
      <div className={`kpd-app-layout__sidebar ${isImpersonating ? 'top-12' : ''}`}>
        <UserSidebar />
      </div>

      {/* Mobile header - premium with blur */}
      <header className={`kpd-app-layout__mobile-header ${isImpersonating ? 'top-12' : ''}`}>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="kpd-app-layout__menu-button"
          aria-label={isMobileMenuOpen ? 'Zatvori izbornik' : 'Otvori izbornik'}
          aria-expanded={isMobileMenuOpen}
        >
          {/* Animated hamburger icon */}
          <span className={`kpd-hamburger ${isMobileMenuOpen ? 'kpd-hamburger--open' : ''}`}>
            <span className="kpd-hamburger__line kpd-hamburger__line--top"></span>
            <span className="kpd-hamburger__line kpd-hamburger__line--middle"></span>
            <span className="kpd-hamburger__line kpd-hamburger__line--bottom"></span>
          </span>
        </button>
        <span className="kpd-app-layout__mobile-title">KPD Klasifikator</span>
        <NotificationBell />
      </header>

      {/* Mobile sidebar overlay with backdrop blur */}
      <div
        className={`kpd-app-layout__overlay ${isMobileMenuOpen ? 'kpd-app-layout__overlay--visible' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile sidebar with slide-in animation */}
      <div className={`kpd-app-layout__mobile-sidebar ${isMobileMenuOpen ? 'kpd-app-layout__mobile-sidebar--open' : ''}`}>
        <UserSidebar onNavClick={() => setIsMobileMenuOpen(false)} />
      </div>

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
