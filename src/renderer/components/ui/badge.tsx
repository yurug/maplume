import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
        secondary:
          'bg-warm-100 text-warm-600 dark:bg-warm-700 dark:text-warm-300',
        success:
          'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
        danger:
          'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
        outline:
          'border border-warm-300 text-warm-600 dark:border-warm-600 dark:text-warm-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
