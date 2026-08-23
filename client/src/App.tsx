import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Info from "@/pages/Info";
import Blog from "@/pages/Blog";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/how-it-works"><Info page="how" /></Route>
      <Route path="/security"><Info page="security" /></Route>
      <Route path="/privacy"><Info page="privacy" /></Route>
      <Route path="/faq"><Info page="faq" /></Route>
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={Blog} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
