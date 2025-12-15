'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  History,
  CreditCard,
  Key,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/classify', label: 'AI Klasifikator', icon: Sparkles },
  { href: '/history', label: 'Povijest', icon: History },
  { href: '/billing', label: 'Naplata', icon: CreditCard },
  { href: '/api-keys', label: 'API ključevi', icon: Key },
  { href: '/settings', label: 'Postavke', icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="p-4">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-200
                  ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <item.icon
                  className={`w-5 h-5 ${isActive ? 'text-primary-600' : ''}`}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
