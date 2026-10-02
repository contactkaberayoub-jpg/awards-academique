import type { ReactNode } from 'react';
import { Dialog, type DialogSize } from '../ui/Dialog';

interface ModalProps {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: DialogSize;
}

export function Modal({ title, description, children, onClose, footer, size }: ModalProps) {
  return (
    <Dialog
      title={title}
      description={description}
      onClose={onClose}
      footer={footer}
      size={size}
    >
      {children}
    </Dialog>
  );
}
