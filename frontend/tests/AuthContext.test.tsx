import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { authStorage } from '../src/auth/authStorage';

vi.mock('../src/auth/authApi', () => ({
  authApi: { me: vi.fn() },
}));
vi.mock('../src/api/instructor', () => ({
  instructorApi: { register: vi.fn() },
}));
vi.mock('../src/api/client', () => ({
  registerUnauthorizedHandler: vi.fn(),
}));

import { authApi } from '../src/auth/authApi';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';

function Probe() {
  const { user, isAuthenticated } = useAuth();
  return (
    <div>{isAuthenticated ? `auth:${user?.email}` : 'guest'}</div>
  );
}

describe('AuthContext session persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('keeps the authenticated session after a page refresh', async () => {
    const storedUser = {
      userId: 'u1',
      firstName: 'Emma',
      lastName: 'Martin',
      email: 'emma@example.com',
      role: 'STUDENT' as const,
    };
    authStorage.setToken('application-jwt', true);
    authStorage.setUser(storedUser, true);
    (authApi.me as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { email: 'emma@example.com' },
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByText('auth:emma@example.com')).toBeInTheDocument()
    );
  });

  it('starts as a Guest when no stored session exists', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText('guest')).toBeInTheDocument());
    expect(authApi.me).not.toHaveBeenCalled();
  });
});
