import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const loginWithGoogle = vi.fn();
const authState: {
  loginWithGoogle: typeof loginWithGoogle;
  user: unknown;
  isLoading: boolean;
} = { loginWithGoogle, user: null, isLoading: false };

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: () => authState,
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

import GoogleCallbackPage from '../src/pages/auth/GoogleCallbackPage';
import { GOOGLE_REDIRECT_STORAGE_KEY } from '../src/components/auth/SocialButtons';

const studentUser = {
  userId: 'u1',
  firstName: 'Emma',
  lastName: 'Martin',
  email: 'emma@example.com',
  role: 'STUDENT' as const,
};

describe('GoogleCallbackPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    loginWithGoogle.mockReset();
    authState.user = null;
    authState.isLoading = false;
    window.sessionStorage.clear();
  });

  it('exchanges the one-time code, persists the session and redirects to the dashboard', async () => {
    loginWithGoogle.mockResolvedValue(studentUser);

    render(
      <MemoryRouter initialEntries={['/auth/google/callback?code=one-time-code']}>
        <GoogleCallbackPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(loginWithGoogle).toHaveBeenCalledWith('one-time-code')
    );
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/student', { replace: true })
    );
  });

  it('returns the Guest to the originally intended route after Google authentication', async () => {
    loginWithGoogle.mockResolvedValue(studentUser);
    window.sessionStorage.setItem(
      GOOGLE_REDIRECT_STORAGE_KEY,
      '/courses/course-123'
    );

    render(
      <MemoryRouter initialEntries={['/auth/google/callback?code=one-time-code']}>
        <GoogleCallbackPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/courses/course-123', {
        replace: true,
      })
    );
    // The one-shot intended route must be consumed.
    expect(
      window.sessionStorage.getItem(GOOGLE_REDIRECT_STORAGE_KEY)
    ).toBeNull();
  });

  it('exchanges the code only once under React StrictMode double-invoked effects', async () => {
    loginWithGoogle.mockResolvedValue(studentUser);

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/auth/google/callback?code=strict-code']}>
          <GoogleCallbackPage />
        </MemoryRouter>
      </StrictMode>
    );

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/student', { replace: true })
    );
    expect(loginWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('never exposes the raw "already used" message and continues if a session exists', async () => {
    authState.user = studentUser;
    loginWithGoogle.mockRejectedValue({
      response: {
        data: { message: 'Exchange code has already been used' },
      },
    });

    render(
      <MemoryRouter initialEntries={['/auth/google/callback?code=used-code']}>
        <GoogleCallbackPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/student', { replace: true })
    );
  });

  it('shows a friendly message (not the technical one) for a duplicate exchange with no session', async () => {
    loginWithGoogle.mockRejectedValue({
      response: {
        data: { message: 'Exchange code has already been used' },
      },
    });

    const { findByText, queryByText } = render(
      <MemoryRouter initialEntries={['/auth/google/callback?code=used-code']}>
        <GoogleCallbackPage />
      </MemoryRouter>
    );

    expect(
      await findByText(/déjà été traitée/i)
    ).toBeInTheDocument();
    expect(
      queryByText(/Exchange code has already been used/i)
    ).not.toBeInTheDocument();
  });

  it('restores an existing session when the callback is refreshed without a code', async () => {
    authState.user = studentUser;

    render(
      <MemoryRouter initialEntries={['/auth/google/callback']}>
        <GoogleCallbackPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/student', { replace: true })
    );
    expect(loginWithGoogle).not.toHaveBeenCalled();
  });
});
