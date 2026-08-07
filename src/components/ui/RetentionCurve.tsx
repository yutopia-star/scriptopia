import { useEffect, useRef, useState } from 'react';

interface RetentionCurveProps {
  data: number[];
  labels?: string[];
  height?: number;
}

export function RetentionCurve({ data, labels, height = 180 }: RetentionCurveProps) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setAnimated(true);
      },
      { threshold: 0.2 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const width = 600;
  const h = height;
  const padding = { top: 20, right: 16, bottom: 32, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  if (data.length === 0) return null;

  const maxVal = 100;
  const stepX = chartW / Math.max(data.length - 1, 1);

  const points = data.map((val, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartH - (val / maxVal) * chartH,
    val,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const defaultLabels = ['Page 1', '25%', '50%', '75%', 'End'];
  const xLabels = labels || defaultLabels.slice(0, data.length);

  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${width} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="retention-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--color-accent))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(var(--color-accent))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="retention-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(var(--color-accent))" />
            <stop offset="100%" stopColor="rgb(var(--color-tertiary))" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = padding.top + chartH - (pct / 100) * chartH;
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgb(var(--color-border))"
                strokeWidth="1"
                strokeDasharray={pct === 0 ? '0' : '3 4'}
              />
              <text x={padding.left - 8} y={y + 3} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: '10px' }}>
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#retention-area)" opacity={animated ? 1 : 0} style={{ transition: 'opacity 0.8s ease-out' }} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#retention-line)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1000"
          strokeDashoffset={animated ? '0' : '1000'}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i} opacity={animated ? 1 : 0} style={{ transition: `opacity 0.4s ease-out ${0.5 + i * 0.1}s` }}>
            <circle cx={p.x} cy={p.y} r="4" fill="rgb(var(--color-surface))" stroke="rgb(var(--color-accent))" strokeWidth="2" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-foreground font-semibold" style={{ fontSize: '10px' }}>
              {p.val}%
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, i) => {
          if (i >= points.length) return null;
          return (
            <text key={i} x={points[i].x} y={h - 8} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '10px' }}>
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
