import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const resetPassword = vi.fn();
vi.mock('../src/auth/authApi', () => ({
  authApi: {
    forgotPassword: vi.fn(),
    resetPassword: (...args: unknown[]) => resetPassword(...args),
  },
}));

import ResetPasswordPage from '../src/pages/auth/ResetPasswordPage';

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    resetPassword.mockReset();
  });

  it('reads the token and shows the new password form', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=abc123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    expect(
      screen.getByLabelText(/^nouveau mot de passe$/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/^confirmer le mot de passe$/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /réinitialiser le mot de passe/i })
    ).toBeInTheDocument();
  });

  it('shows an incomplete link message when no token is present', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/lien de réinitialisation est incomplet/i)
    ).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords without calling the API', async () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=abc123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^nouveau mot de passe$/i), {
      target: { value: 'StrongPassword1' },
    });
    fireEvent.change(screen.getByLabelText(/^confirmer le mot de passe$/i), {
      target: { value: 'DifferentPassword2' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /réinitialiser le mot de passe/i })
    );

    expect(
      await screen.findByText(/les mots de passe ne correspondent pas/i)
    ).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('rejects a short (weak) password without calling the API', async () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=abc123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^nouveau mot de passe$/i), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/^confirmer le mot de passe$/i), {
      target: { value: 'short' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /réinitialiser le mot de passe/i })
    );

    expect(
      await screen.findByText(/au moins 8 caractères/i)
    ).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('shows an expired/invalid token error state and offers a new link', async () => {
    resetPassword.mockRejectedValue({
      response: {
        data: { message: 'Ce jeton de réinitialisation a expiré. Veuillez en demander un nouveau.' },
      },
    });

    render(
      <MemoryRouter initialEntries={['/reset-password?token=expired-token']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^nouveau mot de passe$/i), {
      target: { value: 'StrongPassword1' },
    });
    fireEvent.change(screen.getByLabelText(/^confirmer le mot de passe$/i), {
      target: { value: 'StrongPassword1' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /réinitialiser le mot de passe/i })
    );

    await waitFor(() => expect(resetPassword).toHaveBeenCalled());

    expect(
      screen.getByRole('link', { name: /demander un nouveau lien/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/peut avoir expiré/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/jeton de réinitialisation a expiré/i)
    ).not.toBeInTheDocument();
    expect(resetPassword).toHaveBeenCalledWith('expired-token', 'StrongPassword1');
  });

  it('shows a success state with a login link after a successful reset', async () => {
    resetPassword.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter initialEntries={['/reset-password?token=abc123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^nouveau mot de passe$/i), {
      target: { value: 'StrongPassword1' },
    });
    fireEvent.change(screen.getByLabelText(/^confirmer le mot de passe$/i), {
      target: { value: 'StrongPassword1' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /réinitialiser le mot de passe/i })
    );

    expect(
      await screen.findByText(/mot de passe a été réinitialisé/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /^se connecter$/i })
    ).toBeInTheDocument();
    expect(resetPassword).toHaveBeenCalledWith('abc123', 'StrongPassword1');
  });
});