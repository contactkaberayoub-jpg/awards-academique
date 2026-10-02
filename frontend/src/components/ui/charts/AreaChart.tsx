interface AreaChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
  showGrid?: boolean;
}

function buildSmoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

const W = 600;
const PAD = 8;

export function AreaChart({
  data,
  labels,
  height = 180,
  color = 'var(--color-primary)',
  formatValue,
  showGrid = true,
}: AreaChartProps) {
  const values = data.length > 0 ? data : [0];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map<[number, number]>((value, index) => {
    const x = values.length === 1 ? W / 2 : PAD + (index / (values.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (value - min) / range) * (height - PAD * 2);
    return [x, y];
  });

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1][0]},${height} L ${points[0][0]},${height} Z`;
  const gridLines = [0.25, 0.5, 0.75].map((fraction) => PAD + fraction * (height - PAD * 2));

  const lastValue = values[values.length - 1];

  return (
    <div className="w-full">
      <div className="relative w-full" style={{ height }}>
        <svg
          viewBox={`0 0 ${W} ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label="Graphique en aires"
        >
          <defs>
            <linearGradient id={`area-fill-${color.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {showGrid &&
            gridLines.map((y) => (
              <line
                key={y}
                x1={PAD}
                y1={y}
                x2={W - PAD}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth="1"
                strokeDasharray="3 5"
                vectorEffect="non-scaling-stroke"
              />
            ))}

          <path d={areaPath} fill={`url(#area-fill-${color.replace(/\W/g, '')})`} />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {values.length > 1 && (
          <div
            className="pointer-events-none absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{
              left: '100%',
              top: `${(points[points.length - 1][1] / height) * 100}%`,
              borderColor: color,
              backgroundColor: 'var(--color-surface)',
            }}
            aria-hidden="true"
          />
        )}

        <div className="pointer-events-none absolute right-0 top-0 z-10 hidden items-center gap-1.5 rounded-sm border border-border bg-surface/95 px-2.5 py-1 text-2xs font-medium tabular-nums text-text-secondary shadow-sm sm:flex">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          {formatValue ? formatValue(lastValue) : lastValue}
        </div>
      </div>

      {labels && labels.length > 1 && (
        <div className="mt-2 flex justify-between text-2xs font-medium text-text-muted">
          {labels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
