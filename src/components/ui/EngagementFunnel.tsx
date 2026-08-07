import { useEffect, useState } from 'react';

interface FunnelStep {
  label: string;
  value: number;
  pct?: number;
}

interface EngagementFunnelProps {
  steps: FunnelStep[];
}

export function EngagementFunnel({ steps }: EngagementFunnelProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const maxVal = steps[0]?.value || 1;

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const widthPct = (step.value / maxVal) * 100;
        const dropoff = i > 0 ? ((steps[i - 1].value - step.value) / steps[i - 1].value) * 100 : 0;
        return (
          <div key={i} className="group">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{step.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold text-foreground">{step.value}</span>
                {step.pct !== undefined && (
                  <span className="font-mono text-2xs text-muted-foreground">{step.pct}%</span>
                )}
              </div>
            </div>
            <div className="mt-1.5 h-6 overflow-hidden bg-muted">
              <div
                className="flex h-full items-center justify-end px-2 transition-all duration-700"
                style={{
                  width: animated ? `${widthPct}%` : '0%',
                  background: i === 0
                    ? 'linear-gradient(90deg, rgb(var(--color-tertiary)), rgb(var(--color-tertiary) / 0.8))'
                    : i === steps.length - 1
                      ? 'linear-gradient(90deg, rgb(var(--color-accent) / 0.8), rgb(var(--color-accent)))'
                      : 'linear-gradient(90deg, rgb(var(--color-tertiary) / 0.7), rgb(var(--color-tertiary) / 0.5))',
                  transitionDelay: `${i * 120}ms`,
                }}
              />
            </div>
            {i > 0 && dropoff > 0 && (
              <p className="mt-0.5 font-mono text-2xs text-muted-foreground">
                {dropoff.toFixed(0)}% drop-off
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
