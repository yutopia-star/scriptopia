interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES: Record<string, string> = {
  sm: 'h-7 w-7 text-2xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-lg',
};

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  return (
    <div className={`flex items-center justify-center rounded-full border border-border bg-secondary font-mono font-semibold text-foreground ${SIZES[size]} ${className}`}>
      {initials}
    </div>
  );
}
