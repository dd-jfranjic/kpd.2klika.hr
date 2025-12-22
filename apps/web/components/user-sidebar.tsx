'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  Sparkles,
  LayoutDashboard,
  History,
  CreditCard,
  Settings,
  Users,
  Building2,
  ChevronDown,
  LogOut,
  User,
  FileText,
  ExternalLink,
  Home,
} from 'lucide-react';

// App version - update this with each release
const APP_VERSION = 'v1.3.0';
import { useState, useRef, useEffect } from 'react';

// User menu items - organized by sections
const userNavItems = [
  {
    section: 'Glavni izbornik',
    items: [
      { href: '/classify', label: 'AI Klasifikator', icon: Sparkles, primary: true },
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/history', label: 'Povijest upita', icon: History },
    ]
  },
  {
    section: 'Postavke',
    items: [
      { href: '/settings/profile', label: 'Profil', icon: User },
      { href: '/settings/workspace', label: 'Workspace', icon: Building2 },
      { href: '/settings/members', label: 'Članovi tima', icon: Users },
      { href: '/settings/billing', label: 'Pretplata', icon: CreditCard },
    ]
  }
];

export function UserSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    if (!isUserMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  return (
    <aside className="kpd-user-sidebar">
      {/* Logo */}
      <div className="kpd-user-sidebar__header">
        <Link href="/classify" className="kpd-user-sidebar__logo">
          <div className="kpd-user-sidebar__logo-brand">
            <span className="kpd-user-sidebar__logo-title">AI KPD</span>
            <span className="kpd-user-sidebar__logo-subtitle">Klasifikator</span>
            <span className="kpd-user-sidebar__logo-underline"></span>
          </div>
          <span className="kpd-user-sidebar__logo-by">by 2klika</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="kpd-user-sidebar__nav">
        {userNavItems.map((section) => (
          <div key={section.section} className="kpd-user-sidebar__section">
            <h3 className="kpd-user-sidebar__section-title">
              {section.section}
            </h3>
            <ul className="kpd-user-sidebar__list">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' &&
                   item.href !== '/classify' &&
                   pathname.startsWith(item.href));

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`kpd-user-sidebar__link ${isActive ? 'kpd-user-sidebar__link--active' : ''} ${item.primary ? 'kpd-user-sidebar__link--primary' : ''}`}
                    >
                      <item.icon className="kpd-user-sidebar__link-icon" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Version & Info section */}
      <div className="kpd-user-sidebar__info">
        <div className="kpd-user-sidebar__version">
          <span className="kpd-user-sidebar__version-badge">{APP_VERSION}</span>
        </div>
        <Link href="/" className="kpd-user-sidebar__info-link">
          <Home className="w-3.5 h-3.5" />
          Početna stranica
        </Link>
        <Link href="/changelog" className="kpd-user-sidebar__info-link">
          <FileText className="w-3.5 h-3.5" />
          Changelog
        </Link>
        <a
          href="https://www.2klika.hr"
          target="_blank"
          rel="noopener noreferrer"
          className="kpd-user-sidebar__info-link"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Created by 2klika.hr
        </a>
      </div>

      {/* User section at bottom */}
      <div className="kpd-user-sidebar__footer" ref={userMenuRef}>
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="kpd-user-sidebar__user-button"
        >
          <div className="kpd-user-sidebar__user-avatar">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.firstName || 'User'}
                className="kpd-user-sidebar__user-avatar-img"
              />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="kpd-user-sidebar__user-info">
            <span className="kpd-user-sidebar__user-name">
              {user?.firstName || 'Korisnik'} {user?.lastName || ''}
            </span>
            <span className="kpd-user-sidebar__user-email">
              {user?.email || ''}
            </span>
          </div>
          <ChevronDown className={`kpd-user-sidebar__user-chevron ${isUserMenuOpen ? 'kpd-user-sidebar__user-chevron--open' : ''}`} />
        </button>

        {/* User dropdown */}
        {isUserMenuOpen && (
          <div className="kpd-user-sidebar__dropdown">
            <Link
              href="/settings/profile"
              onClick={() => setIsUserMenuOpen(false)}
              className="kpd-user-sidebar__dropdown-item"
            >
              <Settings className="w-4 h-4" />
              Postavke profila
            </Link>
            <button
              onClick={() => logout()}
              className="kpd-user-sidebar__dropdown-item kpd-user-sidebar__dropdown-item--danger"
            >
              <LogOut className="w-4 h-4" />
              Odjava
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
