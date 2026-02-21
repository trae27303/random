import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

import Home from "@/pages/home";
import VideoChat from "@/pages/video-chat";
import AuthPage from "@/pages/auth";
import ModelsPage from "@/pages/models";
import DirectCallPage from "@/pages/direct-call";
import ModelDashboard from "@/pages/model-dashboard";
import TokensPage from "@/pages/tokens";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/video" component={VideoChat} />
      <Route path="/models" component={ModelsPage} />
      <Route path="/call/:modelId" component={DirectCallPage} />
      <Route path="/dashboard" component={ModelDashboard} />
      <Route path="/tokens" component={TokensPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
