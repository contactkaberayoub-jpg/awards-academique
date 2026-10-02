import { Check } from 'lucide-react';
import { Fragment } from 'react';
import { ringStyles } from '@/lib/tones';

export interface Milestone {
  label: string;
  sublabel?: string;
  state: 'complete' | 'current' | 'upcoming';
  /** Hue for this milestone — color as information. */
  tone?: string;
  /** Optional Fraunces numeral shown inside the marker (e.g. "II"). */
  numeral?: string;
}

interface MilestonePathProps {
  milestones: Milestone[];
  size?: 'sm' | 'md';
  className?: string;
}

const markerSizes = {
  sm: { marker: 'h-6 w-6', icon: 'h-3 w-3', numeral: 'text-xs', gap: 3, label: 'text-2xs' },
  md: { marker: 'h-8 w-8', icon: 'h-3.5 w-3.5', numeral: 'text-sm', gap: 3.5, label: 'text-xs' },
} as const;

function Marker({ milestone, size }: { milestone: Milestone; size: 'sm' | 'md' }) {
  const styles = markerSizes[size];
  const tone = milestone.tone ?? 'var(--color-primary)';

  if (milestone.state === 'complete') {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full text-white ${styles.marker}`}
        style={{
          backgroundColor: tone,
          boxShadow: ringStyles(tone, 2).boxShadow,
        }}
      >
        <Check className={styles.icon} strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }

  if (milestone.state === 'current') {
    return (
      <span
        className={`relative flex shrink-0 items-center justify-center rounded-full bg-surface ${styles.marker}`}
        style={ringStyles(tone, styles.gap)}
      >
        {milestone.numeral ? (
          <span
            className={`font-display font-semibold leading-none ${styles.numeral}`}
            style={{ color: tone }}
          >
            {milestone.numeral}
          </span>
        ) : (
          <span className="relative flex h-full w-full items-center justify-center">
            <span
              className="absolute h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: tone }}
            />
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border bg-surface ${styles.marker}`}
      style={{ borderColor: 'var(--color-border-strong)' }}
    >
      {milestone.numeral && (
        <span className={`font-display font-medium text-text-muted ${styles.numeral}`}>
          {milestone.numeral}
        </span>
      )}
    </span>
  );
}

export function MilestonePath({ milestones, size = 'md', className }: MilestonePathProps) {
  const styles = markerSizes[size];

  return (
    <div
      role="list"
      aria-label="Chemin de progression"
      className={['flex w-full items-start overflow-x-auto pb-1', className ?? ''].join(' ')}
    >
      {milestones.map((milestone, index) => {
        const isFirst = index === 0;
        const isLast = index === milestones.length - 1;
        const connectorTone = milestones[index]?.tone ?? 'var(--color-primary)';

        return (
          <Fragment key={milestone.label}>
            <div role="listitem" className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span
                  className={['h-0.5 rounded-full transition-colors', isFirst ? 'bg-transparent' : ''].join(' ')}
                  style={
                    isFirst
                      ? undefined
                      : {
                          flex: '1',
                          backgroundColor:
                            milestones[index - 1]?.state === 'upcoming'
                              ? 'var(--color-border)'
                              : connectorTone,
                          opacity: milestones[index - 1]?.state === 'upcoming' ? 0.6 : 1,
                        }
                  }
                />
                <Marker milestone={milestone} size={size} />
                <span
                  className={['h-0.5 rounded-full', isLast ? 'bg-transparent' : ''].join(' ')}
                  style={
                    isLast
                      ? undefined
                      : {
                          flex: '1',
                          backgroundColor:
                            milestone.state === 'upcoming' ? 'var(--color-border)' : connectorTone,
                          opacity: milestone.state === 'upcoming' ? 0.6 : 1,
                        }
                  }
                />
              </div>

              <div className="mt-2 max-w-full text-center">
                <p
                  className={[
                    'truncate font-medium',
                    styles.label,
                    milestone.state === 'current'
                      ? 'text-text-primary'
                      : milestone.state === 'complete'
                        ? 'text-text-primary'
                        : 'text-text-muted',
                  ].join(' ')}
                >
                  {milestone.label}
                </p>
                {milestone.sublabel && (
                  <p className="mt-1 truncate text-2xs text-text-muted">{milestone.sublabel}</p>
                )}
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

export function romanNumeral(value: number): string {
  const table: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let remaining = value;
  let result = '';
  for (const [numeral, symbol] of table) {
    while (remaining >= numeral) {
      result += symbol;
      remaining -= numeral;
    }
  }
  return result;
}
