import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface AnimatedStatProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  icon?: ReactNode;
  color?: string;
  decimals?: number;
}

export function AnimatedStat({ value, suffix, prefix, label, icon, color, decimals = 0 }: AnimatedStatProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !animated) {
          setAnimated(true);
          const duration = 1200;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(value * eased);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, animated]);

  const formatted = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div ref={ref} className="group relative border-l border-border pl-4 py-1 transition-all duration-300 hover:border-accent">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-foreground">
            {prefix}{formatted}{suffix}
          </p>
        </div>
        {icon && (
          <div className={`text-muted-foreground ${color ?? ''}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
