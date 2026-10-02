import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes } from 'react';

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
}

const track = {
  sm: 'h-5 w-9',
  md: 'h-6 w-11',
};

const thumb = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

const thumbTranslate = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
};

export function Switch({
  checked,
  onCheckedChange,
  label,
  size = 'md',
  disabled,
  id,
  className,
  ...props
}: SwitchProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${disabled ? 'opacity-60' : ''} ${className ?? ''}`}>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={[
          'relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-normal',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
          checked ? 'border-primary bg-primary' : 'border-border bg-surface-tertiary',
          track[size],
        ].join(' ')}
        {...props}
      >
        <motion.span
          layout
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={[
            'inline-block rounded-full bg-white shadow-sm',
            checked ? thumbTranslate[size] : 'translate-x-0.5',
            thumb[size],
          ].join(' ')}
        />
      </button>
      {label && (
        <label htmlFor={id} className="select-none text-sm text-text-primary">
          {label}
        </label>
      )}
    </div>
  );
}
