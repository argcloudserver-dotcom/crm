/**
 * AUDIT FIX (v13): Root-level error boundary so unexpected render errors show
 * a friendly fallback instead of a blank white screen.
 */
import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class RootErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string }): void {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
    window.location.assign("/");
  };

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The page hit an unexpected error. You can try reloading or go back to the home page.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              Reload
            </button>
            <button
              onClick={this.reset}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default RootErrorBoundary;
