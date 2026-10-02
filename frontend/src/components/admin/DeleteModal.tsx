import { TriangleAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '../ui/Button';

interface DeleteModalProps {
  itemName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  description?: string;
}

export function DeleteModal({
  itemName,
  isDeleting,
  onCancel,
  onConfirm,
  description = 'Cette action est irréversible : l\'élément sera définitivement supprimé du système.',
}: DeleteModalProps) {
  return (
    <Modal
      title="Supprimer l'élément"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isDeleting}>
            Annuler
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isDeleting}>
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-error-tint">
          <TriangleAlert className="h-5 w-5 text-error" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-text-primary">
            Vous êtes sur le point de supprimer{' '}
            <span className="font-semibold text-text-primary">{itemName}</span>.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
        </div>
      </div>
    </Modal>
  );
}
