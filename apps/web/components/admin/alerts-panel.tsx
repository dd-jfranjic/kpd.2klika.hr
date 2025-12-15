'use client';

import { AlertTriangle, AlertCircle, Info, CheckCircle, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type AlertType = 'warning' | 'error' | 'info' | 'success';

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  link?: string;
  linkText?: string;
  dismissible?: boolean;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
  maxVisible?: number;
  loading?: boolean;
}

const alertConfig: Record<AlertType, {
  icon: typeof AlertTriangle;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  textColor: string;
}> = {
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
    textColor: 'text-yellow-800'
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    textColor: 'text-red-800'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    textColor: 'text-blue-800'
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    textColor: 'text-green-800'
  },
};

export function AlertsPanel({ alerts, onDismiss, maxVisible = 5, loading }: AlertsPanelProps) {
  const visibleAlerts = alerts.slice(0, maxVisible);
  const hiddenCount = alerts.length - maxVisible;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Upozorenja</h3>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Upozorenja</h3>
        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Nema aktivnih upozorenja</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Upozorenja
          {alerts.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              {alerts.length}
            </span>
          )}
        </h3>
      </div>
      <div className="space-y-2">
        {visibleAlerts.map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${config.textColor}`}>{alert.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
                {alert.link && (
                  <Link
                    href={alert.link}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 mt-1"
                  >
                    {alert.linkText || 'Pogledaj'}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {alert.dismissible && onDismiss && (
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          );
        })}
        {hiddenCount > 0 && (
          <p className="text-xs text-gray-500 text-center pt-2">
            + još {hiddenCount} upozorenja
          </p>
        )}
      </div>
    </div>
  );
}
