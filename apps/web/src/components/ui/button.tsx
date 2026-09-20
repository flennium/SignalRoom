import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn.js';

const buttonStyles = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'border-pulse bg-pulse text-white hover:bg-pulse-dark',
        secondary: 'border-ink bg-ink text-white hover:bg-ink-soft',
        quiet: 'border-line bg-white text-ink hover:border-ink hover:bg-fog',
        ghost:
          'border-transparent bg-transparent text-muted hover:bg-white/10 hover:text-white',
      },
      size: {
        default: 'h-11',
        compact: 'h-9 min-h-9 px-3',
        icon: 'size-11 min-h-11 px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, ...props }: Props) {
  return (
    <button
      className={cn(buttonStyles({ variant, size }), className)}
      {...props}
    />
  );
}
