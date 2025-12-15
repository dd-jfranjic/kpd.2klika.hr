'use client';

import {
  UserPlus,
  CreditCard,
  Building2,
  FileText,
  Shield,
  Trash2,
  Settings,
  RefreshCw,
  LucideIcon
} from 'lucide-react';
import Link from 'next/link';

type ActivityType =
  | 'user_created'
  | 'user_suspended'
  | 'user_activated'
  | 'org_created'
  | 'plan_upgraded'
  | 'plan_downgraded'
  | 'payment_received'
  | 'invoice_created'
  | 'config_changed'
  | 'user_deleted'
  | 'role_changed';

interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  actor?: string;
  target?: string;
  link?: string;
}

interface RecentActivityProps {
  activities: Activity[];
  maxVisible?: number;
  loading?: boolean;
  showViewAll?: boolean;
}

const activityConfig: Record<ActivityType, {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}> = {
  user_created: { icon: UserPlus, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
  user_suspended: { icon: Shield, bgColor: 'bg-red-100', iconColor: 'text-red-600' },
  user_activated: { icon: Shield, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
  org_created: { icon: Building2, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
  plan_upgraded: { icon: CreditCard, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
  plan_downgraded: { icon: CreditCard, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
  payment_received: { icon: CreditCard, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
  invoice_created: { icon: FileText, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
  config_changed: { icon: Settings, bgColor: 'bg-gray-100', iconColor: 'text-gray-600' },
  user_deleted: { icon: Trash2, bgColor: 'bg-red-100', iconColor: 'text-red-600' },
  role_changed: { icon: RefreshCw, bgColor: 'bg-yellow-100', iconColor: 'text-yellow-600' },
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Upravo sada';
  if (diffInSeconds < 3600) return `Prije ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Prije ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 604800) return `Prije ${Math.floor(diffInSeconds / 86400)} d`;

  return then.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' });
}

export function RecentActivity({ activities, maxVisible = 10, loading, showViewAll = true }: RecentActivityProps) {
  const visibleActivities = activities.slice(0, maxVisible);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Nedavna aktivnost</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 animate-pulse rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-100 animate-pulse rounded w-3/4" />
                <div className="h-3 bg-gray-100 animate-pulse rounded w-1/4 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Nedavna aktivnost</h3>
        <p className="text-sm text-gray-500 text-center py-4">Nema nedavne aktivnosti</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Nedavna aktivnost</h3>
        {showViewAll && (
          <Link
            href="/admin/audit"
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            Vidi sve
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {visibleActivities.map((activity) => {
          const config = activityConfig[activity.type] || activityConfig.config_changed;
          const Icon = config.icon;

          const content = (
            <div className="flex items-start gap-3 group">
              <div className={`p-2 rounded-full ${config.bgColor}`}>
                <Icon className={`w-4 h-4 ${config.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 group-hover:text-primary-600 transition-colors">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatTimeAgo(activity.timestamp)}
                  {activity.actor && ` • ${activity.actor}`}
                </p>
              </div>
            </div>
          );

          if (activity.link) {
            return (
              <Link key={activity.id} href={activity.link} className="block">
                {content}
              </Link>
            );
          }

          return <div key={activity.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}
