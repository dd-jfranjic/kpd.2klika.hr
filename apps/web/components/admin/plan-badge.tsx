'use client';

import { Crown, Zap, Star, Rocket, Gift } from 'lucide-react';

type PlanType = 'FREE' | 'BASIC' | 'PLUS' | 'PRO' | 'BUSINESS' | 'ENTERPRISE' | 'UNLIMITED';

interface PlanBadgeProps {
  plan: PlanType | string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const planConfig: Record<string, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Crown;
  label: string;
}> = {
  FREE: {
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: Gift,
    label: 'Free'
  },
  BASIC: {
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Zap,
    label: 'Basic'
  },
  PLUS: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Star,
    label: 'Plus'
  },
  PRO: {
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    icon: Rocket,
    label: 'Pro'
  },
  BUSINESS: {
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: Crown,
    label: 'Business'
  },
  ENTERPRISE: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Crown,
    label: 'Enterprise'
  },
  UNLIMITED: {
    color: 'text-rose-700',
    bgColor: 'bg-gradient-to-r from-rose-50 to-purple-50',
    borderColor: 'border-rose-300',
    icon: Crown,
    label: 'Unlimited'
  },
};

const sizeConfig = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

const iconSizeConfig = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

export function PlanBadge({ plan, showIcon = true, size = 'md' }: PlanBadgeProps) {
  const normalizedPlan = plan.toUpperCase();
  const config = planConfig[normalizedPlan] || planConfig.FREE;
  const Icon = config.icon;

  return (
    <span className={`
      inline-flex items-center gap-1.5 rounded-full font-medium border
      ${config.bgColor} ${config.color} ${config.borderColor} ${sizeConfig[size]}
      ${normalizedPlan === 'UNLIMITED' ? 'ring-1 ring-rose-200' : ''}
    `}>
      {showIcon && <Icon className={iconSizeConfig[size]} />}
      {config.label}
    </span>
  );
}
