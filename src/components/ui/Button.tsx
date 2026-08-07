import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-soft',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-surface-hover border border-border',
  ghost: 'bg-transparent text-foreground hover:bg-surface-hover',
  outline: 'border border-border bg-transparent text-foreground hover:border-accent/40 hover:bg-surface-hover',
  danger: 'bg-error text-error-foreground hover:bg-error/90 shadow-soft',
  accent: 'bg-accent text-accent-foreground hover:bg-accent-hover shadow-glow',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs font-medium rounded-lg',
  md: 'h-10 px-4 text-sm font-medium rounded-lg',
  lg: 'h-12 px-6 text-sm font-medium rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, fullWidth = false, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {loading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
