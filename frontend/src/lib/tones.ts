/**
 * TONE SYSTEM — color used as information, not decoration.
 *
 * Each semantic thing in the platform (a lesson type, a course status, an
 * instructor) owns one hue. Components consume these constants directly and
 * apply them through inline styles so Tailwind's static scanner can't miss
 * them, and so light/dark rendering stays consistent via hex-alpha tints.
 */

/** Milestone palette — six muted, "ink-adjacent" hues. */
export const MILESTONE_TONES = [
  '#1A73E8', // blue
  '#0F766E', // teal
  '#B06000', // amber
  '#6D28D9', // violet
  '#D93025', // rose
  '#475569', // slate
] as const;

/** Lesson types each own a hue. */
export const LESSON_TYPE_TONES: Record<string, string> = {
  video: '#1A73E8',
  text: '#0F766E',
  pdf: '#B06000',
  quiz: '#6D28D9',
  assignment: '#D93025',
};

/** Course / lesson status hues (shared vocabulary with the status badges). */
export const STATUS_TONES: Record<string, string> = {
  draft: '#64748B',
  pending: '#B06000',
  rejected: '#D93025',
  published: '#188038',
  archived: '#475569',
};

/** Deterministic hue for a named thing (instructor, course, category…). */
export function toneFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return MILESTONE_TONES[hash % MILESTONE_TONES.length];
}

/** Soft background tint for a hue (e.g. rgba(…, 0.1)). */
export function tint(hex: string, alpha = 0.1): string {
  return hexToRgba(hex, alpha);
}

/** Inline style set for a "tone chip" — soft fill + colored glyph. */
export function toneStyles(hex: string, alpha = 0.1): React.CSSProperties {
  return {
    backgroundColor: hexToRgba(hex, alpha),
    color: hex,
  };
}

/** Inline style set for a colored ring around an avatar/badge. */
export function ringStyles(hex: string, width = 3): React.CSSProperties {
  return {
    boxShadow: `0 0 0 2px var(--color-surface), 0 0 0 ${width + 2}px ${hex}`,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const value =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean;
  const int = Number.parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
