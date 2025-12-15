'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  Building2,
  BookOpen,
  Settings,
  FileText,
  BarChart3,
  Sparkles,
  History,
  CreditCard,
  ExternalLink,
} from 'lucide-react';

// App version - update this with each release
const APP_VERSION = 'v1.0.0';

// Admin menu items - ADMINISTRACIJA first, then APLIKACIJA (no user account section for admins)
const adminNavItems = [
  {
    section: 'Administracija',
    items: [
      { href: '/admin', label: 'Dashboard', icon: BarChart3, exact: true },
      { href: '/admin/users', label: 'Korisnici', icon: Users },
      { href: '/admin/organizations', label: 'Organizacije', icon: Building2 },
      { href: '/admin/billing', label: 'Billing', icon: CreditCard },
      { href: '/admin/kpd-codes', label: 'KPD Šifrarnik', icon: BookOpen },
      { href: '/admin/settings', label: 'Postavke', icon: Settings },
      { href: '/admin/audit', label: 'Audit Log', icon: FileText },
    ]
  },
  {
    section: 'Aplikacija',
    items: [
      { href: '/classify', label: 'AI Klasifikator', icon: Sparkles },
      { href: '/history', label: 'Povijest', icon: History },
    ]
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r h-full overflow-y-auto sidebar-scroll">
      {/* Logo */}
      <div className="h-16 px-4 flex items-center border-b border-gray-200">
        <Link href="/admin" className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
            style={{ backgroundColor: 'var(--primary-600)' }}
          >
            <span className="text-white font-bold text-sm">KPD</span>
          </div>
          <div>
            <span className="font-semibold text-gray-900 block leading-tight text-sm">
              AI KPD Klasifikator
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: 'var(--primary-600)' }}
            >
              Admin Panel
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-3 flex flex-col min-h-[calc(100%-4rem)]">
        {adminNavItems.map((section) => (
          <div key={section.section} className="mb-6">
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {section.section}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const itemWithExact = item as typeof item & { exact?: boolean };
                const isActive = itemWithExact.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    (item.href !== '/dashboard' &&
                     item.href !== '/classify' &&
                     item.href !== '/admin' &&
                     pathname.startsWith(item.href));

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-200
                        ${
                          isActive
                            ? 'text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                      style={
                        isActive
                          ? { backgroundColor: 'var(--primary-600)' }
                          : undefined
                      }
                    >
                      <item.icon
                        className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Version & Info section */}
        <div className="mt-auto pt-4 border-t border-gray-200 mx-3">
          <div className="flex items-center justify-center mb-2">
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{APP_VERSION}</span>
          </div>
          <Link href="/changelog" className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <FileText className="w-3.5 h-3.5" />
            Changelog
          </Link>
          <a
            href="https://www.2klika.hr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Created by 2klika.hr
          </a>
        </div>
      </nav>
    </aside>
  );
}
