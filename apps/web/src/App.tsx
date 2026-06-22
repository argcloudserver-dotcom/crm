import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/shared/contexts/AuthContext";
import { I18nProvider } from "@/shared/contexts/i18nContext";
import { PermissionsProvider } from "@/shared/contexts/PermissionsContext";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { useHeartbeat } from "@/shared/hooks/useHeartbeat";
import { useInitializeCsrf } from "@/shared/hooks/useInitializeCsrf";
import NotFound from "@/shared/components/not-found";
import { RootErrorBoundary } from "@/shared/components/RootErrorBoundary";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Auth pages
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { VerifyEmailPage } from "@/features/auth/pages/VerifyEmailPage";
import { PendingApprovalPage } from "@/features/auth/pages/PendingApprovalPage";
import { OAuthCallbackPage } from "@/features/auth/pages/OAuthCallbackPage";

// Dashboard pages
import { HomePage } from "@/features/home/pages/HomePage";
import { LeadsListPage } from "@/features/leads/pages/LeadsListPage";
import { LeadsKanbanPage } from "@/features/leads/pages/LeadsKanbanPage";
import { LeadDetailPage } from "@/features/leads/pages/LeadDetailPage";
import { ProjectsPage } from "@/features/projects/pages/ProjectsPage";
import { ProjectDetailPage } from "@/features/projects/pages/ProjectDetailPage";
import { ResalePage } from "@/features/resale/pages/ResalePage";
import { ClientsPage } from "@/features/clients/pages/ClientsPage";
import { ClientDetailPage } from "@/features/clients/pages/ClientDetailPage";
import { EmployeesPage } from "@/features/employees/pages/EmployeesPage";
import { PendingEmployeesPage } from "@/features/employees/pages/PendingEmployeesPage";
import { EmployeeDetailPage } from "@/features/employees/pages/EmployeeDetailPage";
import { PlannerPage } from "@/features/planner/pages/PlannerPage";
import { ReportsPage } from "@/features/reports/pages/ReportsPage";
import { ProfilePage } from "@/features/profile/pages/ProfilePage";
import { PermissionsPage } from "@/features/permissions/pages/PermissionsPage";
// AUDIT FIX (v12): Public diagnostics page for /api/health/auth-config
import { AuthConfigPage } from "@/features/health/pages/AuthConfigPage";

function HeartbeatInit() {
  useHeartbeat();
  useInitializeCsrf();
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/pending-approval",
  // Public OAuth landing routes — must NEVER be gated by ProtectedPages,
  // otherwise the user is redirected to /login before the code can be
  // exchanged, producing an infinite login loop.
  "/auth/google/callback",
  "/auth/facebook/callback",
];

function ProtectedPages() {
  const { currentUser, isLoading } = useAuth();


  if (isLoading) return null;
  if (!currentUser) return <Redirect to="/login" />;
  // SECURITY FIX: pending / rejected accounts must NOT reach the CRM.
  if (currentUser.status === "pending" || currentUser.status === "rejected") {
    return <Redirect to="/pending-approval" />;
  }

  return (
    <AppLayout>
      <HeartbeatInit />
      <Switch>
        <Route path="/home" component={HomePage} />
        <Route path="/leads" component={LeadsListPage} />
        <Route path="/leads/kanban" component={LeadsKanbanPage} />
        <Route path="/leads/:id" component={LeadDetailPage} />
        <Route path="/projects" component={ProjectsPage} />
        <Route path="/projects/:id" component={ProjectDetailPage} />
        <Route path="/resale" component={ResalePage} />
        <Route path="/clients" component={ClientsPage} />
        <Route path="/clients/:id" component={ClientDetailPage} />
        <Route path="/employees" component={EmployeesPage} />
        <Route path="/employees/pending" component={PendingEmployeesPage} />
        <Route path="/employees/:id" component={EmployeeDetailPage} />
        <Route path="/planner" component={PlannerPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/permissions" component={PermissionsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  // CSRF must be initialized for ALL routes (including public auth pages like
  // /verify-email and /register), not only inside ProtectedPages. Otherwise the
  // CSRF token getter is never registered and mutating requests return 403.
  useInitializeCsrf();
  const { currentUser, isLoading } = useAuth();
  const [location] = useLocation();

  // AUDIT FIX (v12): Public diagnostics route — accessible without login.
  if (location.startsWith("/auth-config")) {
    return <AuthConfigPage />;
  }

  const isAuthPath = AUTH_PATHS.some(p => location.startsWith(p));

  if (isAuthPath) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/verify-email" component={VerifyEmailPage} />
        <Route path="/pending-approval" component={PendingApprovalPage} />
        <Route path="/auth/google/callback" component={OAuthCallbackPage} />
        <Route path="/auth/facebook/callback" component={OAuthCallbackPage} />
      </Switch>
    );
  }

  if (location === "/") {
    if (isLoading) return null;
    return currentUser ? <Redirect to="/home" /> : <Redirect to="/login" />;
  }

  return <ProtectedPages />;
}

function App() {
  return (
    // AUDIT FIX (v13): Root error boundary so render-time crashes show a
    // friendly fallback instead of a blank page.
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <I18nProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AuthProvider>
                  <PermissionsProvider>
                    <Router />
                  </PermissionsProvider>
                </AuthProvider>
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
      <SpeedInsights />
    </RootErrorBoundary>
  );
}

export default App;
