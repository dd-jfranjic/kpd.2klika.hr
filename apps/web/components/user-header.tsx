'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { User, Crown, LogOut, ChevronDown, Sparkles } from 'lucide-react';

export function UserHeader() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  return (
    <header className="bg-white border-b h-16 fixed top-0 left-0 right-0 z-40 shadow-sm">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between max-w-5xl mx-auto">
        {/* Left side: Premium Logo */}
        <Link href="/classify" className="flex items-center gap-3 group">
          {/* Icon with gradient */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow"
            style={{
              background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))'
            }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>

          {/* Text branding */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-xs font-bold tracking-wide"
                style={{ color: 'var(--primary-500)' }}
              >
                AI
              </span>
              <span className="font-bold text-gray-900 text-lg tracking-tight">
                KPD
              </span>
              <span className="font-semibold text-gray-700 text-base hidden sm:inline">
                Klasifikator
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-medium tracking-wider hidden sm:block">
              by <span style={{ color: 'var(--primary-600)' }}>2klika</span>
            </span>
          </div>
        </Link>

        {/* Right side: User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.firstName || 'User'}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {user?.firstName || 'Korisnik'}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border py-2 z-50">
              {/* User info */}
              <div className="px-4 py-2 border-b">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.email}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Moj profil
                </Link>

                <Link
                  href="/billing"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span>Nadogradi paket</span>
                  <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    PRO
                  </span>
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t pt-1">
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4 text-gray-400" />
                  Odjava
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
