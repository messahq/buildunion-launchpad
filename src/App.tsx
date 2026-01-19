import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import BuildUnion from "./pages/BuildUnion";
import BuildUnionWorkspace from "./pages/BuildUnionWorkspace";
import BuildUnionNewProject from "./pages/BuildUnionNewProject";
import BuildUnionProjectDetails from "./pages/BuildUnionProjectDetails";
import BuildUnionProjectFacts from "./pages/BuildUnionProjectFacts";
import BuildUnionPricing from "./pages/BuildUnionPricing";
import BuildUnionProfile from "./pages/BuildUnionProfile";
import BuildUnionQuickMode from "./pages/BuildUnionQuickMode";
import BuildUnionProfileView from "./pages/BuildUnionProfileView";
import BuildUnionProjectSummary from "./pages/BuildUnionProjectSummary";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ConfirmEmail from "./pages/ConfirmEmail";
import DockLogin from "./pages/DockLogin";
import DockRegister from "./pages/DockRegister";
import OrbPage from "./pages/OrbPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/buildunion" element={<BuildUnion />} />
            <Route path="/buildunion/workspace" element={<BuildUnionWorkspace />} />
            <Route path="/buildunion/workspace/new" element={<BuildUnionNewProject />} />
            <Route path="/buildunion/project/:projectId" element={<BuildUnionProjectDetails />} />
            <Route path="/buildunion/facts" element={<BuildUnionProjectFacts />} />
            <Route path="/buildunion/pricing" element={<BuildUnionPricing />} />
            <Route path="/buildunion/profile" element={<BuildUnionProfile />} />
            <Route path="/buildunion/profile/view" element={<BuildUnionProfileView />} />
            <Route path="/buildunion/quick" element={<BuildUnionQuickMode />} />
            <Route path="/buildunion/summary" element={<BuildUnionProjectSummary />} />
            <Route path="/buildunion/summary/:summaryId" element={<BuildUnionProjectSummary />} />
            <Route path="/buildunion/login" element={<Login />} />
            <Route path="/buildunion/register" element={<Register />} />
            <Route path="/buildunion/confirm-email" element={<ConfirmEmail />} />
            <Route path="/dock/login" element={<DockLogin />} />
            <Route path="/dock/register" element={<DockRegister />} />
            <Route path="/orb" element={<OrbPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
