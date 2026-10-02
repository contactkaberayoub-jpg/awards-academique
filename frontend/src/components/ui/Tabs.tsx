import { motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface TabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  badge?: number;
  content: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export function Tabs({ items, defaultValue, value, onChange, variant = 'underline', className }: TabsProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string>(defaultValue ?? items[0]?.value ?? '');

  const active = isControlled ? value : internal;

  const select = (next: string) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const activeIndex = Math.max(0, items.findIndex((item) => item.value === active));

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Onglets"
        className={[
          'flex gap-1',
          variant === 'underline' ? 'border-b border-border' : 'rounded-lg bg-surface-tertiary p-1',
        ].join(' ')}
      >
        {items.map((item) => {
          const isActive = item.value === active;
          return (
            <button
              key={item.value}
              role="tab"
              id={`tab-${item.value}`}
              aria-selected={isActive}
              aria-controls={`panel-${item.value}`}
              onClick={() => select(item.value)}
              className={[
                'relative inline-flex items-center gap-2 whitespace-nowrap rounded-sm px-4 py-2 text-sm font-medium transition-colors duration-fast',
                variant === 'underline'
                  ? isActive
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                  : isActive
                    ? 'text-text-primary shadow-sm bg-surface'
                    : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              {item.icon && <item.icon className="h-4 w-4" aria-hidden="true" />}
              {item.label}
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="rounded-full bg-primary-tint px-2 py-0.5 text-2xs font-semibold text-primary">
                  {item.badge}
                </span>
              )}
              {variant === 'underline' && isActive && (
                <motion.span
                  layoutId="tabs-active-underline"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      {items[activeIndex] && (
        <div
          key={items[activeIndex].value}
          role="tabpanel"
          id={`panel-${items[activeIndex].value}`}
          aria-labelledby={`tab-${items[activeIndex].value}`}
          className="pt-5"
        >
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {items[activeIndex].content}
          </motion.div>
        </div>
      )}
    </div>
  );
}
