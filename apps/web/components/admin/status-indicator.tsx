'use client';

type Status = 'active' | 'suspended' | 'pending' | 'past_due' | 'cancelled' | 'trialing' | 'paused';

interface StatusIndicatorProps {
  status: Status | string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  active: { color: 'text-green-700', bgColor: 'bg-green-100', label: 'Aktivan' },
  suspended: { color: 'text-red-700', bgColor: 'bg-red-100', label: 'Suspendiran' },
  pending: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', label: 'Na čekanju' },
  past_due: { color: 'text-orange-700', bgColor: 'bg-orange-100', label: 'Dospjelo' },
  cancelled: { color: 'text-gray-700', bgColor: 'bg-gray-100', label: 'Otkazano' },
  trialing: { color: 'text-blue-700', bgColor: 'bg-blue-100', label: 'Probni' },
  paused: { color: 'text-purple-700', bgColor: 'bg-purple-100', label: 'Pauzirano' },
};

const sizeConfig = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export function StatusIndicator({ status, showLabel = true, size = 'md' }: StatusIndicatorProps) {
  const normalizedStatus = status.toLowerCase().replace(/_/g, '_');
  const config = statusConfig[normalizedStatus] || statusConfig.pending;

  const dotColorClass = normalizedStatus === 'active' ? 'bg-green-500' :
                        normalizedStatus === 'suspended' ? 'bg-red-500' :
                        normalizedStatus === 'past_due' ? 'bg-orange-500' :
                        normalizedStatus === 'cancelled' ? 'bg-gray-500' :
                        normalizedStatus === 'trialing' ? 'bg-blue-500' :
                        normalizedStatus === 'paused' ? 'bg-purple-500' :
                        'bg-yellow-500';

  if (!showLabel) {
    return (
      <span className={`inline-block rounded-full ${sizeConfig[size]} ${dotColorClass}`} />
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      <span className={`rounded-full ${sizeConfig[size]} ${dotColorClass}`} />
      {config.label}
    </span>
  );
}
