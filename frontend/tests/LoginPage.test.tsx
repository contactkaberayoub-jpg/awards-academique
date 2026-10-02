import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

import LoginPage from '../src/pages/auth/LoginPage';

describe('LoginPage', () => {
  it('keeps email/password login and adds the Google button for Guests', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(
      screen.getByLabelText(/e-mail ou nom d'utilisateur/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^mot de passe$/i)).toBeInTheDocument();

    const googleLink = screen.getByRole('link', {
      name: /se connecter avec google/i,
    });
    expect(googleLink).toBeInTheDocument();
    expect(googleLink).toHaveAttribute(
      'href',
      'http://localhost:8080/api/auth/google'
    );
  });
});
