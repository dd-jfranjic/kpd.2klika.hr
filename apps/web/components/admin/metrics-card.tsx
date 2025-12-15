'use client';

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
  };
  icon: LucideIcon;
  href?: string;
  loading?: boolean;
}

export function MetricsCard({ title, value, change, icon: Icon, href, loading }: MetricsCardProps) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          )}
          {change !== undefined && !loading && (
            <div className="mt-2 flex items-center gap-1">
              {change.value > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : change.value < 0 ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <Minus className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-sm font-medium ${
                change.value > 0 ? 'text-green-600' : change.value < 0 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {change.value > 0 ? '+' : ''}{change.value}
              </span>
              <span className="text-sm text-gray-500">({change.period})</span>
            </div>
          )}
        </div>
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: 'var(--primary-100, #e0e7ff)' }}
        >
          <Icon className="w-6 h-6" style={{ color: 'var(--primary-600, #4f46e5)' }} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
