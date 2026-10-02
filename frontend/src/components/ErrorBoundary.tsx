import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * TEMPORAIRE — outil de diagnostic pour le écran blanc (bug étudiant / Home).
 * Capte les erreurs de rendu non gérées et les affiche à la place d'un écran
 * blanc silencieux. A supprimer une fois le bug confirmé corrigé.
 */
type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Erreur de rendu capturée :', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            margin: 0,
            padding: 24,
            minHeight: '100vh',
            background: '#0D1117',
            color: '#F87171',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            whiteSpace: 'pre-wrap',
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>Erreur de rendu capturée (diagnostic temporaire)</h1>
          <p style={{ color: '#FCA5A5', marginBottom: 12 }}>{this.state.error.message}</p>
          <pre style={{ fontSize: 12, overflowX: 'auto' }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
