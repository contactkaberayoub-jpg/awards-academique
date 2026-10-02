import type { ReactNode } from 'react';
import { tint } from '@/lib/tones';

interface ParcoursHeroProps {
  /** Role accent hue — the hero inherits the role's color. */
  accent: string;
  /** Short eyebrow line above the title, e.g. "Votre parcours". */
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  /** Fraunces numeral stamped into the seal, e.g. "I". */
  numeral: string;
  /** Caption under the numeral, e.g. "Étape actuelle". */
  numeralCaption: string;
  /** Optional small badge shown in the eyebrow row. */
  badge?: ReactNode;
  /** Optional action buttons under the description. */
  actions?: ReactNode;
}

/**
 * ParcoursHero — the one idea carried through every role. The left side
 * speaks in Inter; the right side is a certificate-style seal whose numeral
 * breathes in Fraunces. Same anatomy, three accents, three vantages.
 */
export function ParcoursHero({
  accent,
  eyebrow,
  title,
  description,
  numeral,
  numeralCaption,
  badge,
  actions,
}: ParcoursHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      {/* Soft accent atmosphere — the hero breathes in the role's color */}
      <div
        className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full"
        style={{ background: `radial-gradient(circle, ${tint(accent, 0.14)} 0%, transparent 70%)` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-36 -left-24 h-72 w-72 rounded-full"
        style={{ background: `radial-gradient(circle, ${tint(accent, 0.07)} 0%, transparent 70%)` }}
        aria-hidden="true"
      />
      {/* Hairline carried across the top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ backgroundColor: accent, opacity: 0.35 }}
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="flex flex-wrap items-center gap-2.5 text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
            <span
              className="inline-block h-px w-7"
              style={{ backgroundColor: accent, opacity: 0.55 }}
              aria-hidden="true"
            />
            {eyebrow}
            {badge}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary sm:text-base">
            {description}
          </p>
          {actions && <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>}
        </div>

        <div className="shrink-0 self-start lg:self-center">
          <div
            className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full"
            style={{ boxShadow: `0 0 0 1px ${accent}, 0 0 44px ${tint(accent, 0.28)}` }}
          >
            <div
              className="absolute inset-2 rounded-full"
              style={{ backgroundColor: tint(accent, 0.07) }}
              aria-hidden="true"
            />
            <span
              className="relative flex h-[calc(100%-18px)] w-[calc(100%-18px)] flex-col items-center justify-center rounded-full border border-dashed"
              style={{ borderColor: accent, opacity: 0.55 }}
            >
              <span
                className="font-display text-6xl font-semibold leading-none tracking-tight"
                style={{ color: accent }}
              >
                {numeral}
              </span>
              <span className="mt-1.5 px-3 text-center text-2xs font-medium uppercase tracking-wider text-text-secondary">
                {numeralCaption}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
