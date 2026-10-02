import { AnimatePresence, motion } from 'framer-motion';

interface ValidationMessageProps {
  id?: string;
  message?: string;
}

export function ValidationMessage({ id, message }: ValidationMessageProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          id={id}
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className="mt-1.5 text-xs text-error"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
