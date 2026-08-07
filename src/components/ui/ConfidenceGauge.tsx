interface ConfidenceGaugeProps {
  level: 'high' | 'medium' | 'low' | string;
  score?: number;
  size?: number;
}

export function ConfidenceGauge({ level, score, size = 120 }: ConfidenceGaugeProps) {
  const pct = level === 'high' ? 85 : level === 'medium' ? 55 : 25;
  const displayScore = score ?? pct;
  const color = level === 'high' ? 'rgb(var(--color-success))' : level === 'medium' ? 'rgb(var(--color-warning))' : 'rgb(var(--color-error))';
  const label = level === 'high' ? 'High' : level === 'medium' ? 'Medium' : 'Low';

  const radius = (size - 16) / 2;
  const circumference = Math.PI * radius;
  const dashOffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + 12 }}>
        <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
          <path
            d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
            fill="none"
            stroke="rgb(var(--color-border))"
            strokeWidth="8"
            strokeLinecap="square"
          />
          <path
            d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="square"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="font-mono text-2xl font-semibold text-foreground">{displayScore}%</span>
        </div>
      </div>
      <span className="mt-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label} Confidence</span>
    </div>
  );
}
