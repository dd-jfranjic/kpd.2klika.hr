'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

// Global toast state
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

const notifyListeners = () => {
  toastListeners.forEach((listener) => listener([...toasts]));
};

export const toast = {
  success: (title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, type: 'success', title, message }];
    notifyListeners();
    setTimeout(() => toast.dismiss(id), 5000);
  },
  error: (title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, type: 'error', title, message }];
    notifyListeners();
    setTimeout(() => toast.dismiss(id), 7000);
  },
  warning: (title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, type: 'warning', title, message }];
    notifyListeners();
    setTimeout(() => toast.dismiss(id), 5000);
  },
  info: (title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, type: 'info', title, message }];
    notifyListeners();
    setTimeout(() => toast.dismiss(id), 5000);
  },
  dismiss: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  },
};

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: AlertCircle,
};

const styles = {
  success: 'bg-success-50 border-success-500 text-success-700',
  error: 'bg-error-50 border-error-500 text-error-700',
  warning: 'bg-warning-50 border-warning-500 text-warning-700',
  info: 'bg-primary-50 border-primary-500 text-primary-700',
};

export function Toaster() {
  const [activeToasts, setActiveToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.push(setActiveToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setActiveToasts);
    };
  }, []);

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {activeToasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={`
              flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg
              min-w-[300px] max-w-[400px] animate-in slide-in-from-right
              ${styles[t.type]}
            `}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{t.title}</p>
              {t.message && (
                <p className="text-sm opacity-80 mt-1">{t.message}</p>
              )}
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="p-1 hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
