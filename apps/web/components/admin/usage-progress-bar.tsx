'use client';

interface UsageProgressBarProps {
  current: number;
  limit: number;
  showNumbers?: boolean;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UsageProgressBar({
  current,
  limit,
  showNumbers = true,
  showPercentage = false,
  size = 'md',
  className = ''
}: UsageProgressBarProps) {
  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;
  const isUnlimited = limit === 0 || limit === -1 || limit === Infinity;

  const heightConfig = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const barColor = isUnlimited
    ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
    : isAtLimit
      ? 'bg-red-500'
      : isNearLimit
        ? 'bg-orange-500'
        : 'bg-green-500';

  if (isUnlimited) {
    return (
      <div className={`${className}`}>
        {showNumbers && (
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{current.toLocaleString()} upita</span>
            <span className="text-purple-600 font-medium">Neograničeno</span>
          </div>
        )}
        <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${heightConfig[size]}`}>
          <div
            className={`h-full rounded-full ${barColor} animate-pulse`}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showNumbers && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{current.toLocaleString()} / {limit.toLocaleString()}</span>
          {showPercentage && (
            <span className={`font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-gray-600'}`}>
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${heightConfig[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
