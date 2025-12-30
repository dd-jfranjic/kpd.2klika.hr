'use client';

import { useState, useEffect } from 'react';
import { X, Gift, MessageSquare, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface LoginPopupNotification {
  id: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function LoginPopup() {
  const { token, user } = useAuth();
  const [popups, setPopups] = useState<LoginPopupNotification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch login popups on mount and poll every 30 seconds for real-time updates
  useEffect(() => {
    if (!token || !user) return;

    fetchLoginPopups(true); // Initial fetch with loading state

    // Poll every 30 seconds for new popups (so admin-sent popups appear quickly)
    const interval = setInterval(() => fetchLoginPopups(false), 30000);
    return () => clearInterval(interval);
  }, [token, user]);

  const fetchLoginPopups = async (isInitial = false) => {
    if (!token) return;

    // Only show loading on initial fetch, not during polling
    if (isInitial) setLoading(true);

    try {
      const res = await fetch('/api/v1/notifications/login-popups', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const newPopups = data.data || [];

        // Only update if we have new popups AND no popup is currently displayed
        // This prevents interrupting the user while viewing a popup
        setPopups((currentPopups) => {
          if (currentPopups.length === 0 && newPopups.length > 0) {
            return newPopups;
          }
          return currentPopups;
        });
      }
    } catch (error) {
      console.error('Error fetching login popups:', error);
    }

    if (isInitial) setLoading(false);
  };

  const markAsShown = async (notificationId: string) => {
    if (!token) return;
    try {
      await fetch(`/api/v1/notifications/${notificationId}/shown`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error marking popup as shown:', error);
    }
  };

  const handleClose = async () => {
    const currentPopup = popups[currentIndex];
    if (currentPopup) {
      await markAsShown(currentPopup.id);
    }

    if (currentIndex < popups.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setPopups([]);
    }
  };

  const getPopupIcon = (popup: LoginPopupNotification) => {
    const type = popup.metadata?.type as string | undefined;
    if (type === 'GIFT_QUERIES') {
      return (
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Gift className="w-8 h-8 text-green-600" />
        </div>
      );
    }
    if (type === 'SUPPORT_MESSAGE') {
      return (
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-blue-600" />
        </div>
      );
    }
    return (
      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-8 h-8 text-primary-600" />
      </div>
    );
  };

  // Don't render while loading or if no popups
  if (loading || popups.length === 0) {
    return null;
  }

  const currentPopup = popups[currentIndex];
  if (!currentPopup) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header with close button */}
        <div className="relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative top gradient */}
          <div className="h-2 bg-gradient-to-r from-primary-500 via-green-500 to-primary-500"></div>
        </div>

        {/* Content */}
        <div className="px-8 py-10 text-center">
          {getPopupIcon(currentPopup)}

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {currentPopup.title}
          </h2>

          {currentPopup.body && (
            <p className="text-gray-600 leading-relaxed mb-6">
              {currentPopup.body}
            </p>
          )}

          {/* Gift specific info */}
          {currentPopup.metadata?.type === 'GIFT_QUERIES' && (
            <div className="bg-green-50 rounded-xl p-4 mb-6">
              <p className="text-green-800 font-medium">
                +{(currentPopup.metadata?.amount as number) || 0} bonus upita dodano!
              </p>
            </div>
          )}

          {/* Pagination indicator */}
          {popups.length > 1 && (
            <div className="flex items-center justify-center gap-2 mb-4">
              {popups.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}

          <button
            onClick={handleClose}
            className="w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
          >
            {currentIndex < popups.length - 1 ? 'Dalje' : 'Super, hvala!'}
          </button>
        </div>
      </div>
    </div>
  );
}
