'use client';

import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger';
}

interface QuickActionsProps {
  actions: QuickAction[];
  columns?: 2 | 3 | 4;
}

const variantStyles = {
  default: 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700',
  primary: 'bg-primary-50 hover:bg-primary-100 border-primary-200 text-primary-700',
  danger: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700',
};

export function QuickActions({ actions, columns = 2 }: QuickActionsProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Brze akcije</h3>
      <div className={`grid ${gridCols[columns]} gap-2`}>
        {actions.map((action) => {
          const Icon = action.icon;
          const variant = action.variant || 'default';
          const className = `
            flex items-center gap-2 p-3 rounded-lg border text-sm font-medium
            transition-all duration-200 cursor-pointer
            ${variantStyles[variant]}
          `;

          if (action.href) {
            return (
              <Link key={action.id} href={action.href} className={className}>
                <Icon className="w-4 h-4" />
                <span className="truncate">{action.label}</span>
              </Link>
            );
          }

          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={className}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
