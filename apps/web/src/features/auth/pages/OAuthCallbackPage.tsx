import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/shared/contexts/AuthContext";

/**
 * Public route mounted at /auth/google/callback and /auth/facebook/callback.
 *
 * In normal operation the backend handles the OAuth code exchange at
 * /api/auth/{provider}/callback, sets the session cookie, and 302s the
 * browser back to PUBLIC_APP_URL. This page exists as a safety net for
 * the case where Google/Facebook hits the SPA path directly (e.g. a
 * stale Cloud Console "Authorized redirect URI" pointing at the frontend
 * origin without the /api prefix): it forwards the full query string to
 * the API so the cookie gets set, instead of trapping the user in a
 * /login redirect loop.
 */
export function OAuthCallbackPage() {
  const [location, setLocation] = useLocation();
  const { refetch } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const url = new URL(window.location.href);
    const error = url.searchParams.get("error");
    if (error) {
      setLocation(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    // If there is a `code` param, the SPA was hit directly — forward to
    // the API so it can exchange the code and set the session cookie.
    const code = url.searchParams.get("code");
    if (code) {
      // location is like "/auth/google/callback"; same shape under /api.
      window.location.replace(`/api${location}${url.search}`);
      return;
    }

    // No code, no error — the API already set the session cookie and
    // bounced us here. Refresh the auth state and head to the dashboard.
    refetch();
    setLocation("/home");
  }, [location, refetch, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">Signing you in…</div>
    </div>
  );
}

export default OAuthCallbackPage;
