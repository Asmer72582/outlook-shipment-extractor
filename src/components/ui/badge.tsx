import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        variant === 'default' && 'border-transparent bg-primary text-primary-foreground',
        variant === 'secondary' && 'border-transparent bg-secondary text-secondary-foreground',
        variant === 'destructive' && 'border-transparent bg-destructive text-destructive-foreground',
        variant === 'outline' && 'text-foreground',
        variant === 'success' && 'border-transparent bg-green-100 text-green-800',
        variant === 'warning' && 'border-transparent bg-yellow-100 text-yellow-800',
        className
      )}
      {...props}
    />
  );
}
