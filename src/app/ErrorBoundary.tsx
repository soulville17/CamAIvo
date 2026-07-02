import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Filet de sécurité global : erreur React inattendue → écran de reprise. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Erreur non gérée :", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="glass max-w-md p-8 text-center">
          <p className="font-display text-2xl font-bold text-snow">
            Oups, quelque chose a cassé 😅
          </p>
          <p className="mt-2 text-sm text-muted">
            Une erreur inattendue s&rsquo;est produite. Recharge la page — si ça
            persiste, contacte le support Telegram.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-ember-gradient px-6 py-2.5 text-sm font-bold text-white shadow-ember hover:brightness-110"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }
}
