import { Alert } from '../ui/Alert';

interface NoticeProps {
  type: 'success' | 'error';
  message: string | null;
  title?: string;
}

export function Notice({ type, message, title }: NoticeProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="mb-5">
      <Alert variant={type} title={title ?? (type === 'success' ? 'Succès' : 'Une erreur est survenue')}>
        {message}
      </Alert>
    </div>
  );
}
