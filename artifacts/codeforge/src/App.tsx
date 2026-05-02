import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import Repositories from "@/pages/Repositories";
import RepositoryDetail from "@/pages/RepositoryDetail";
import Sessions from "@/pages/Sessions";
import Chat from "@/pages/Chat";
import Terminal from "@/pages/Terminal";
import Security from "@/pages/Security";
import Deployments from "@/pages/Deployments";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
});

function Router() {
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
