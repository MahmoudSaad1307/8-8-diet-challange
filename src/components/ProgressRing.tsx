import { useEffect, useState } from 'react';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string; // hex
  trackColor?: string;
  label?: string;
  sublabel?: string;
  unit?: string;
  warning?: boolean;
  glow?: boolean;
}

export function ProgressRing({
  value,
  max,
  size = 132,
  stroke = 12,
  color = '#10e0a0',
  trackColor = 'rgba(255,255,255,0.06)',
  label,
  sublabel,
  unit,
  warning = false,
  glow = true,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimatedValue(value), 60);
    return () => clearTimeout(t);
  }, [value]);

  const clamped = Math.max(0, Math.min(animatedValue, max));
  const progress = max > 0 ? clamped / max : 0;
  const dash = circumference * progress;
  const displayValue = Math.round(value);

  const strokeColor = warning ? '#fbbf24' : color;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{
            transition: 'stroke-dasharray 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
            filter: glow ? `drop-shadow(0 0 8px ${strokeColor}66)` : undefined,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className="font-display text-2xl font-extrabold leading-none"
          style={{ color: warning ? '#fbbf24' : '#fff' }}
        >
          {displayValue.toLocaleString('ar-EG')}
        </span>
        {unit && <span className="mt-1 text-[10px] font-semibold text-slate-400">{unit}</span>}
        {label && <span className="mt-1.5 text-xs font-bold text-slate-200">{label}</span>}
        {sublabel && <span className="text-[10px] font-medium text-slate-500">{sublabel}</span>}
      </div>
    </div>
  );
}
