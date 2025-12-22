'use client';

import { useState } from 'react';
import { Repeat, Zap } from 'lucide-react';

export type BillingType = 'monthly' | 'onetime';

interface BillingToggleProps {
  value: BillingType;
  onChange: (value: BillingType) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/**
 * BillingToggle - Per-card billing type selector
 * Allows switching between monthly subscription and one-time payment
 */
export function BillingToggle({ value, onChange, disabled = false, size = 'md' }: BillingToggleProps) {
  const sizeClasses = size === 'sm' ? 'text-xs py-1 px-2' : 'text-sm py-1.5 px-3';

  return (
    <div className={`kpd-billing-toggle ${disabled ? 'kpd-billing-toggle--disabled' : ''}`}>
      <button
        type="button"
        onClick={() => onChange('monthly')}
        disabled={disabled}
        className={`kpd-billing-toggle__btn ${sizeClasses} ${value === 'monthly' ? 'kpd-billing-toggle__btn--active' : ''}`}
      >
        <Repeat size={size === 'sm' ? 12 : 14} />
        <span>Mjesecno</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('onetime')}
        disabled={disabled}
        className={`kpd-billing-toggle__btn ${sizeClasses} ${value === 'onetime' ? 'kpd-billing-toggle__btn--active' : ''}`}
      >
        <Zap size={size === 'sm' ? 12 : 14} />
        <span>Jednokratno</span>
      </button>
    </div>
  );
}

/**
 * Hook for managing per-card billing type state
 */
export function useBillingToggle(initialPlans: string[]) {
  const [billingTypes, setBillingTypes] = useState<Record<string, BillingType>>(
    Object.fromEntries(initialPlans.map(plan => [plan, 'monthly' as BillingType]))
  );

  const setBillingType = (plan: string, type: BillingType) => {
    setBillingTypes(prev => ({ ...prev, [plan]: type }));
  };

  const getBillingType = (plan: string): BillingType => {
    return billingTypes[plan] || 'monthly';
  };

  return { billingTypes, setBillingType, getBillingType };
}
