'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export type ActionButtonVariant = 
  | 'schedule'   // Purple - for schedule actions
  | 'activate'   // Green - for activation/success actions
  | 'assign'     // Orange - for assignment actions
  | 'lock'       // Indigo - for lock actions
  | 'unlock'     // Amber - for unlock actions
  | 'primary'    // Primary brand color
  | 'danger'     // Red - for destructive actions
  | 'secondary'; // Gray - for secondary actions

interface ActionButtonProps {
  variant: ActionButtonVariant;
  icon?: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const variantStyles: Record<ActionButtonVariant, { bg: string; text: string }> = {
  schedule: { bg: '#F3E8FF', text: '#7C3AED' },
  activate: { bg: '#D1FAE5', text: '#059669' },
  assign: { bg: '#FED7AA', text: '#C2410C' },
  lock: { bg: '#E0E7FF', text: '#4F46E5' },
  unlock: { bg: '#FEF3C7', text: '#D97706' },
  primary: { bg: '#DBEAFE', text: '#1D4ED8' },
  danger: { bg: '#FEE2E2', text: '#DC2626' },
  secondary: { bg: '#F3F4F6', text: '#4B5563' },
};

export function ActionButton({
  variant,
  icon: Icon,
  children,
  onClick,
  disabled = false,
  title,
  className = '',
  size = 'sm',
}: ActionButtonProps) {
  const styles = variantStyles[variant];
  const sizeClasses = size === 'sm' 
    ? 'px-3 py-1.5 text-xs gap-1.5' 
    : 'px-4 py-2 text-sm gap-2';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        group relative inline-flex items-center rounded-lg font-medium 
        transition-all duration-200 hover:shadow-md
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
        ${sizeClasses}
        ${className}
      `}
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
      }}
    >
      {Icon && <Icon className={iconSize} />}
      <span>{children}</span>
    </button>
  );
}

export default ActionButton;
