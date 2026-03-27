import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-muted mb-1.5 ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl bg-white border border-border text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 shadow-sm',
            error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-500 ml-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
