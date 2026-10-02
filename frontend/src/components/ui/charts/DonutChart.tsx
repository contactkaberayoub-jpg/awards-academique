export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (value: number) => string;
}

export function DonutChart({
  data,
  size = 180,
  thickness = 22,
  centerLabel,
  centerValue,
  formatValue,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Graphique en anneau">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-surface-tertiary)"
            strokeWidth={thickness}
          />
          {data.map((datum) => {
            const fraction = datum.value / total;
            const dash = fraction * circumference;
            const offset = -accumulated / total * circumference;
            accumulated += datum.value;
            return (
              <circle
                key={datum.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={datum.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="font-display text-2xl font-semibold leading-none tabular-nums text-text-primary">
              {centerValue}
            </span>
          )}
          {centerLabel && <span className="mt-1 text-xs font-medium text-text-secondary">{centerLabel}</span>}
        </div>
      </div>

      <ul className="w-full max-w-[220px] space-y-2.5">
        {data.map((datum) => (
          <li key={datum.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: datum.color }} />
              <span className="truncate text-text-secondary">{datum.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-text-primary">
              {formatValue ? formatValue(datum.value) : datum.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
