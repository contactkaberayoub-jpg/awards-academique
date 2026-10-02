import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface APIErrorProps {
  message: string | null;
}

export function APIError({ message }: APIErrorProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-start gap-2 rounded-sm bg-error-tint px-4 py-3 text-sm text-error"
          role="alert"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
