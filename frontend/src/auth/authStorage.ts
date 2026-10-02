import type { User } from '../types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/**
 * NOTE: Using localStorage for auth tokens carries an XSS vulnerability risk.
 * For production, consider migrating to HttpOnly, Secure, SameSite cookies
 * (requires backend changes to set cookies via Set-Cookie header).
 *
 * "Keep me logged in": when persist=true (default) the session survives
 * browser restarts (localStorage); when false it lives only for the tab's
 * lifetime (sessionStorage). This is a purely frontend storage choice and
 * does not require any backend change.
 */

export const authStorage = {
  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return (
      window.localStorage.getItem(TOKEN_KEY) ??
      window.sessionStorage.getItem(TOKEN_KEY)
    );
  },
  setToken(token: string, persist = true): void {
    const store = persist ? window.localStorage : window.sessionStorage;
    store.setItem(TOKEN_KEY, token);
  },
  removeToken(): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
  },
  getUser(): User | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const userStr =
      window.localStorage.getItem(USER_KEY) ??
      window.sessionStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr) as User;
      } catch {
        window.localStorage.removeItem(USER_KEY);
        window.sessionStorage.removeItem(USER_KEY);
        return null;
      }
    }
    return null;
  },
  setUser(user: User, persist = true): void {
    const store = persist ? window.localStorage : window.sessionStorage;
    store.setItem(USER_KEY, JSON.stringify(user));
  },
  removeUser(): void {
    window.localStorage.removeItem(USER_KEY);
    window.sessionStorage.removeItem(USER_KEY);
  },
  clear(): void {
    this.removeToken();
    this.removeUser();
  },
};
