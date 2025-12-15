'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  History,
  CreditCard,
  Key,
  Settings,
  Menu,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/classify', label: 'AI Klasifikator', icon: Sparkles },
  { href: '/history', label: 'Povijest', icon: History },
  { href: '/dashboard', label: 'Statistika', icon: BarChart3 },
  { href: '/billing', label: 'Naplata', icon: CreditCard },
  { href: '/api-keys', label: 'API ključevi', icon: Key },
  { href: '/settings', label: 'Postavke', icon: Settings },
];

export function AppNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Otvori izbornik"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border py-2 z-50">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/classify' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                  transition-colors duration-150
                  ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon
                  className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-gray-500'}`}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
