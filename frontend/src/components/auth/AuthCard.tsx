import type { PropsWithChildren, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AuthCardProps extends PropsWithChildren {
  brandPanel: ReactNode;
}

export function AuthCard({ brandPanel, children }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="grid w-full max-w-4xl overflow-hidden rounded-lg bg-surface shadow-xl md:grid-cols-2"
    >
      <div className="hidden md:block">{brandPanel}</div>
      <div className="p-8 sm:p-12">{children}</div>
    </motion.div>
  );
}
