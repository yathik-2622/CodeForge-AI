import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CodeForgeLogo } from "@/components/CodeForgeLogo";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Repositories from "@/pages/Repositories";
import RepositoryDetail from "@/pages/RepositoryDetail";
import Sessions from "@/pages/Sessions";
import Chat from "@/pages/Chat";
import Terminal from "@/pages/Terminal";
import Security from "@/pages/Security";
import Deployments from "@/pages/Deployments";
import WhatsApp from "@/pages/WhatsApp";
import Instagram from "@/pages/Instagram";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
});

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center animate-pulse">
          <CodeForgeLogo className="w-7 h-7 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Loading CodeForge AI…</p>
      </div>
    </div>
  );
}

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  // Unauthenticated — show landing page (handles GitHub OAuth redirect too)
  if (!user) return <Landing />;

  // Authenticated — show the full app
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/repositories" component={Repositories} />
      <Route path="/repositories/:id" component={RepositoryDetail} />
      <Route path="/chat" component={Sessions} />
      <Route path="/chat/:id" component={Chat} />
      <Route path="/terminal" component={Terminal} />
      <Route path="/security" component={Security} />
      <Route path="/deployments" component={Deployments} />
      <Route path="/whatsapp" component={WhatsApp} />
      <Route path="/instagram" component={Instagram} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base="/">
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
