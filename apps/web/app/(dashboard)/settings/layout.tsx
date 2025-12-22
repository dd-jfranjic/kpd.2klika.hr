'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Building2, Users, CreditCard, Shield } from 'lucide-react';

const settingsNav = [
  { href: '/settings/profile', label: 'Profil', icon: User },
  { href: '/settings/workspace', label: 'Workspace', icon: Building2 },
  { href: '/settings/members', label: 'Članovi tima', icon: Users },
  { href: '/settings/billing', label: 'Naplata', icon: CreditCard },
  { href: '/settings/privacy', label: 'Privatnost', icon: Shield },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Settings Navigation */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__body">
          <nav className="flex flex-wrap gap-2">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-200
                    ${isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Settings Content */}
      {children}
    </div>
  );
}
