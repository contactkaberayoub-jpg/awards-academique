import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export const GOOGLE_REDIRECT_STORAGE_KEY = 'google_oauth_redirect_path';

const GOOGLE_AUTH_URL = `${
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'
}/auth/google`;

const GoogleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 11v2.8h6.5c-.28 1.5-1.7 4.4-6.5 4.4A6.9 6.9 0 0 1 5.1 12 6.9 6.9 0 0 1 12 5.2c2 0 3.35.85 4.12 1.58l2.8-2.7C17.2 2.5 14.86 1.5 12 1.5A10.5 10.5 0 0 0 1.5 12 10.5 10.5 0 0 0 12 22.5c6.06 0 10.08-4.26 10.08-10.27 0-.69-.08-1.22-.17-1.73H12Z"
    />
  </svg>
);

const PROVIDERS = [
  {
    name: 'Facebook',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M14.5 21v-7.6h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46h1.6V4.3C17.3 4.2 16.3 4.1 15.2 4.1c-2.36 0-3.97 1.44-3.97 4.08v2.28H8.6v3h2.63V21h3.27Z"
        />
      </svg>
    ),
  },
  {
    name: 'Twitter',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="m3 3 7.6 9.9L3.1 21h2.3l6.5-7.1L17 21h4l-8-10.4L20.4 3h-2.3l-6 6.5L8 3H3Z"
        />
      </svg>
    ),
  },
];

interface SocialButtonsProps {
  label: string;
  /**
   * Optional internal route the user intended to reach before authenticating.
   * Stored locally so the Google callback can restore it after login.
   */
  redirectPath?: string | null;
}

export function SocialButtons({ label, redirectPath }: SocialButtonsProps) {
  const [notice, setNotice] = useState<string | null>(null);

  const rememberRedirect = () => {
    try {
      if (redirectPath) {
        window.sessionStorage.setItem(GOOGLE_REDIRECT_STORAGE_KEY, redirectPath);
      } else {
        window.sessionStorage.removeItem(GOOGLE_REDIRECT_STORAGE_KEY);
      }
    } catch {
      // sessionStorage may be unavailable (privacy mode); Google login still works.
    }
  };

  return (
    <div>
      {/* Primary provider: a Guest can start the flow without being authenticated. */}
      <a
        href={GOOGLE_AUTH_URL}
        onClick={rememberRedirect}
        className="flex w-full items-center justify-center gap-3 rounded-sm border border-border bg-surface py-3 text-[15px] font-semibold text-text-primary transition-colors hover:border-border-strong hover:bg-surface-secondary"
        aria-label={label.replace('{provider}', 'Google')}
      >
        {GoogleIcon}
        Continuer avec Google
      </a>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.name}
            type="button"
            onClick={() =>
              setNotice(`La connexion avec ${provider.name} sera bientôt disponible.`)
            }
            className="flex items-center justify-center gap-2 rounded-sm border border-border py-2.5 text-text-secondary transition-colors hover:border-border-strong hover:bg-surface-secondary"
            aria-label={label.replace('{provider}', provider.name)}
          >
            {provider.icon}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {notice && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-3 text-center text-xs text-text-muted"
          >
            {notice}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
