import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { resolvePostLoginDestination } from '../../auth/roleRoutes';
import { GOOGLE_REDIRECT_STORAGE_KEY } from '../../components/auth/SocialButtons';
import type { User } from '../../types';

function consumeIntendedRoute(): string | null {
  try {
    const stored = window.sessionStorage.getItem(GOOGLE_REDIRECT_STORAGE_KEY);
    window.sessionStorage.removeItem(GOOGLE_REDIRECT_STORAGE_KEY);
    return stored;
  } catch {
    return null;
  }
}

/**
 * Removes the Google OAuth response parameters from the address bar as soon as
 * they are read. This prevents a page refresh, back/forward navigation or a
 * copied URL from replaying the callback with an already-consumed code.
 */
function stripCallbackParamsFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    ['code', 'state', 'scope', 'authuser', 'prompt', 'hd'].forEach((param) =>
      url.searchParams.delete(param)
    );
    const query = url.searchParams.toString();
    window.history.replaceState(
      {},
      '',
      `${url.pathname}${query ? `?${query}` : ''}`
    );
  } catch {
    // History API unavailable: the single-use guard below still protects us.
  }
}

/**
 * Maps any backend exchange error to a user-facing message. The technical
 * "exchange code has already been used" / validation messages are never shown
 * to the end user.
 */
function friendlyGoogleError(rawMessage?: string): string {
  const message = (rawMessage ?? '').toLowerCase();
  if (message.includes('already') || message.includes('blacklist')) {
    return 'Cette connexion Google a déjà été traitée. Veuillez vous reconnecter.';
  }
  if (message.includes('expired')) {
    return 'La session Google a expiré. Veuillez réessayer.';
  }
  if (message.includes('invalid') || message.includes('missing')) {
    return 'La connexion Google est invalide ou incomplète. Veuillez réessayer.';
  }
  return 'La connexion avec Google a échoué. Veuillez réessayer.';
}

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGoogle, user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Guarantees the one-time exchange code is submitted to the backend at most
  // once per mounted callback, even under React StrictMode's double-invoked
  // effects, rerenders, retries or duplicate clicks.
  const exchangeRef = useRef<{ code: string; promise: Promise<User> } | null>(
    null
  );

  const getExchangePromise = (code: string): Promise<User> => {
    if (exchangeRef.current?.code === code) {
      return exchangeRef.current.promise;
    }
    const promise = loginWithGoogle(code);
    exchangeRef.current = { code, promise };
    return promise;
  };

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const code = searchParams.get('code');

    const goToIntendedDestination = (authenticatedUser: User) => {
      const intendedRoute = consumeIntendedRoute();
      navigate(
        resolvePostLoginDestination(authenticatedUser.role, intendedRoute),
        { replace: true }
      );
    };

    if (errorParam) {
      stripCallbackParamsFromUrl();
      setError(
        errorParam === 'oauth_denied'
          ? 'Connexion Google annulée. Vous pouvez réessayer.'
          : errorParam === 'oauth_not_configured'
            ? 'La connexion avec Google est temporairement indisponible. Veuillez réessayer plus tard.'
            : 'La connexion avec Google a échoué. Veuillez réessayer.'
      );
      return;
    }

    if (!code) {
      // No authorization code in the URL. If a session already exists (for
      // example after a refresh following a successful login) go straight to
      // the intended destination instead of surfacing a technical error.
      if (isLoading) return;
      if (user) {
        goToIntendedDestination(user);
        return;
      }
      setError("Code d'autorisation manquant. Veuillez réessayer.");
      return;
    }

    stripCallbackParamsFromUrl();

    let cancelled = false;

    (async () => {
      try {
        const authenticatedUser = await getExchangePromise(code);
        if (cancelled) return;
        goToIntendedDestination(authenticatedUser);
      } catch (err) {
        if (cancelled) return;
        const raw =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? '';
        // A duplicate exchange can legitimately happen if another tab already
        // completed the flow. If we already have a session, continue normally.
        if (/already|blacklist/i.test(raw) && user) {
          goToIntendedDestination(user);
          return;
        }
        setError(friendlyGoogleError(raw));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, loginWithGoogle, navigate, user, isLoading]);

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-text-secondary">{error}</p>
        <a
          href="/login"
          className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          Retour à la connexion
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}
