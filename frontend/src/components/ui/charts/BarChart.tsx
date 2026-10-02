export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  formatValue?: (value: number) => string;
  highlight?: boolean;
  /** Single hue for all bars — quiet, color as information. */
  color?: string;
}

const fallbackHues = [
  '#1A73E8',
  '#0F766E',
  '#B06000',
  '#6D28D9',
  '#D93025',
  '#475569',
];

const PLOT_TOP = 26;

export function BarChart({ data, height = 200, formatValue, highlight = true, color }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const plotHeight = height;

  return (
    <div>
      <div className="relative" style={{ height: PLOT_TOP + plotHeight }}>
        {/* Grid + baseline */}
        <div className="pointer-events-none absolute inset-0">
          {[0.25, 0.5, 0.75].map((fraction) => (
            <div
              key={fraction}
              className="absolute inset-x-0 border-t border-dashed"
              style={{ top: PLOT_TOP + (1 - fraction) * plotHeight, borderColor: 'var(--color-border)' }}
              aria-hidden="true"
            />
          ))}
          <div
            className="absolute inset-x-0 border-t"
            style={{ top: PLOT_TOP + plotHeight, borderColor: 'var(--color-border-strong)' }}
            aria-hidden="true"
          />
        </div>

        {/* Bars */}
        <div className="absolute inset-x-0 flex items-stretch gap-3" style={{ top: PLOT_TOP, height: plotHeight }}>
          {data.map((datum, index) => {
            const percentage = Math.max((datum.value / max) * 100, 2);
            const hue = color ?? datum.color ?? fallbackHues[index % fallbackHues.length];
            return (
              <div key={`${datum.label}-${index}`} className="group flex min-w-0 flex-1 flex-col justify-end">
                <div className="pointer-events-none mb-1.5 rounded-sm border border-border bg-surface-elevated px-1.5 py-0.5 text-2xs font-semibold tabular-nums text-text-primary opacity-0 shadow-sm transition-opacity duration-fast group-hover:opacity-100">
                  {formatValue ? formatValue(datum.value) : datum.value}
                </div>
                <div
                  className="w-full rounded-t-sm transition-all duration-500 ease-out group-hover:brightness-110"
                  style={{ height: `${percentage}%`, minHeight: 6, backgroundColor: hue, opacity: 0.88 }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-3">
        {data.map((datum, index) => (
          <span
            key={`${datum.label}-${index}`}
            className={`min-w-0 flex-1 truncate text-center text-2xs font-medium ${
              highlight ? 'text-text-secondary' : 'text-text-muted'
            }`}
          >
            {datum.label}
          </span>
        ))}
      </div>
    </div>
  );
}
