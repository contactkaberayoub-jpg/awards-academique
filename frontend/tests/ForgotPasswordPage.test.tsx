import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const forgotPassword = vi.fn();
vi.mock('../src/auth/authApi', () => ({
  authApi: {
    forgotPassword: (...args: unknown[]) => forgotPassword(...args),
    resetPassword: vi.fn(),
  },
}));

import ForgotPasswordPage from '../src/pages/auth/ForgotPasswordPage';

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    forgotPassword.mockReset();
  });

  it('renders the email field, submit button and login link', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/^e-mail$/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /envoyer le lien/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /retour à la connexion/i })
    ).toBeInTheDocument();
  });

  it('shows a validation error for an invalid email and never submits', async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^e-mail$/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));

    expect(
      await screen.findByText(/adresse e-mail valide/i)
    ).toBeInTheDocument();
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('shows a neutral success state and does not reveal whether the account exists', async () => {
    forgotPassword.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^e-mail$/i), {
      target: { value: 'someone@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));

    expect(
      await screen.findByText(/vérifiez votre boîte de réception/i)
    ).toBeInTheDocument();
    expect(forgotPassword).toHaveBeenCalledWith('someone@example.com');
    expect(
      screen.getByText(/si un compte existe avec cette adresse e-mail/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/n'existe pas|n'est pas enregistré/i)
    ).not.toBeInTheDocument();
  });

  it('shows a generic error state when the request fails', async () => {
    forgotPassword.mockRejectedValue({
      response: { data: { message: 'Erreur serveur' } },
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^e-mail$/i), {
      target: { value: 'someone@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));

    expect(
      await screen.findByText(/impossible d’envoyer le lien/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/erreur serveur/i)).not.toBeInTheDocument();
  });

  it('keeps the login link in the success state', async () => {
    forgotPassword.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^e-mail$/i), {
      target: { value: 'someone@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));

    await waitFor(() =>
      expect(screen.getByText(/vérifiez votre boîte de réception/i))
        .toBeInTheDocument()
    );
    expect(
      screen.getByRole('link', { name: /retour à la connexion/i })
    ).toBeInTheDocument();
  });
});