import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-warm-300 bg-white px-3 py-2 text-sm text-warm-900',
          'placeholder:text-warm-400',
          'transition-all duration-200',
          'focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20',
          'hover:border-warm-400',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-warm-50',
          'dark:border-warm-600 dark:bg-warm-800 dark:text-warm-50 dark:placeholder:text-warm-500',
          'dark:focus:border-primary-500 dark:focus:ring-primary-500/20',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
