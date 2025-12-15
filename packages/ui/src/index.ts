// UI Component Library for KPD 2klika
// This package exports shared UI components using shadcn/ui primitives

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export component primitives
export * from '@radix-ui/react-slot';
