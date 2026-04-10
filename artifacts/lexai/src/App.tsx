import { Switch, Route, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import ChatPage from "@/pages/ChatPage";
import DocumentsPage from "@/pages/DocumentsPage";
import LawyerNetPage from "@/pages/LawyerNetPage";
import LawyerProfilePage from "@/pages/LawyerProfilePage";
import MessagesPage from "@/pages/MessagesPage";
import BookingsPage from "@/pages/BookingsPage";
import MembershipPage from "@/pages/MembershipPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AuthTokenSetup() {
  const { token } = useAuth();
  setAuthTokenGetter(() => token);
  return null;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }
  if (!user) {
    return <Redirect to="/login" />;
  }
  return <Layout>{children}</Layout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard">
        <ProtectedLayout><DashboardPage /></ProtectedLayout>
      </Route>
      <Route path="/chat">
        <ProtectedLayout><ChatPage /></ProtectedLayout>
      </Route>
      <Route path="/documents">
        <ProtectedLayout><DocumentsPage /></ProtectedLayout>
      </Route>
      <Route path="/lawyernet/:id">
        <ProtectedLayout><LawyerProfilePage /></ProtectedLayout>
      </Route>
      <Route path="/lawyernet">
        <ProtectedLayout><LawyerNetPage /></ProtectedLayout>
      </Route>
      <Route path="/messages">
        <ProtectedLayout><MessagesPage /></ProtectedLayout>
      </Route>
      <Route path="/bookings">
        <ProtectedLayout><BookingsPage /></ProtectedLayout>
      </Route>
      <Route path="/membership">
        <ProtectedLayout><MembershipPage /></ProtectedLayout>
      </Route>
      <Route path="/settings">
        <ProtectedLayout><SettingsPage /></ProtectedLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AuthTokenSetup />
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
