import { AxiosError } from 'axios';

interface BackendErrorBody {
  status?: number;
  error?: string;
  message?: string;
}

/**
 * The backend's global exception handler always returns a JSON body shaped
 * like { status, error, message } for auth failures (401 bad credentials,
 * 409 duplicate email, 400 validation errors, 500 unexpected errors).
 * This helper extracts a safe, user-facing message from that contract,
 * falling back gracefully for network failures or unexpected shapes.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof AxiosError)) {
    return fallback;
  }

  if (!error.response) {
    return 'Erreur réseau — vérifiez que le serveur est démarré et accessible.';
  }

  const body = error.response.data as BackendErrorBody | undefined;
  if (body?.message) {
    return body.message;
  }

  if (error.response.status >= 500) {
    return 'Une erreur est survenue de notre côté. Veuillez réessayer dans quelques instants.';
  }

  return fallback;
}
