'use client';

import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface AuthWrapperProps {
  children: ReactNode;
}

// Conditional SignedIn - shows content when user is signed in
export function ConditionalSignedIn({ children }: AuthWrapperProps) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return null;

  return <>{children}</>;
}

// Conditional SignedOut - shows content when user is signed out
export function ConditionalSignedOut({ children }: AuthWrapperProps) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return null;

  return <>{children}</>;
}

// User avatar component
interface UserButtonProps {
  afterSignOutUrl?: string;
  appearance?: {
    elements?: {
      avatarBox?: string;
    };
  };
}

export function ConditionalUserButton({ afterSignOutUrl: _afterSignOutUrl = '/' }: UserButtonProps) {
  const { user, logout, loading } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (loading || !user) {
    return (
      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
        <span className="text-gray-500 text-sm">?</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center hover:bg-primary-200 transition-colors"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.firstName || 'User'}
            className="w-9 h-9 rounded-full"
          />
        ) : (
          <span className="text-primary-600 font-medium text-sm">
            {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50">
          <div className="px-4 py-2 border-b">
            <p className="text-sm font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.email}
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Odjava
          </button>
        </div>
      )}
    </div>
  );
}
