import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  GOOGLE_REDIRECT_STORAGE_KEY,
  SocialButtons,
} from '../src/components/auth/SocialButtons';

describe('SocialButtons — Guest Google login', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('renders a labelled Google button for a Guest', () => {
    render(<SocialButtons label="Se connecter avec {provider}" />);

    const link = screen.getByRole('link', { name: /se connecter avec google/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('Continuer avec Google');
  });

  it('points the button at the real backend endpoint', () => {
    render(<SocialButtons label="Se connecter avec {provider}" />);

    const link = screen.getByRole('link', { name: /se connecter avec google/i });
    expect(link).toHaveAttribute('href', 'http://localhost:8080/api/auth/google');
  });

  it('does not require an authenticated state before starting Google login', () => {
    // No AuthProvider is mounted: rendering and clicking must not touch auth state.
    expect(() =>
      render(<SocialButtons label="S'inscrire avec {provider}" />)
    ).not.toThrow();

    const link = screen.getByRole('link', { name: /s'inscrire avec google/i });
    expect(link).toBeInTheDocument();
  });

  it('remembers the intended route before handing over to Google', () => {
    render(
      <SocialButtons
        label="Se connecter avec {provider}"
        redirectPath="/courses/course-123"
      />
    );

    fireEvent.click(screen.getByRole('link', { name: /se connecter avec google/i }));

    expect(
      window.sessionStorage.getItem(GOOGLE_REDIRECT_STORAGE_KEY)
    ).toBe('/courses/course-123');
  });
});
