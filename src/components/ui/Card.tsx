import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ className, glass = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-6 transition-all duration-300',
        glass ? 'glass-card' : 'bg-surface border border-border shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
