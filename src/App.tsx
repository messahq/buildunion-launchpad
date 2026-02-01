import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RegionProvider } from "@/hooks/useRegionSettings";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProjectProvider } from "@/contexts/ProjectContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CitationProvider } from "@/components/citations";
import MobileBottomNav from "@/components/MobileBottomNav";
import Index from "./pages/Index";
import BuildUnion from "./pages/BuildUnion";
import BuildUnionWorkspace from "./pages/BuildUnionWorkspace";
import BuildUnionNewProject from "./pages/BuildUnionNewProject";

import BuildUnionProjectFacts from "./pages/BuildUnionProjectFacts";
import BuildUnionPricing from "./pages/BuildUnionPricing";
import BuildUnionProfile from "./pages/BuildUnionProfile";
import BuildUnionProfileView from "./pages/BuildUnionProfileView";
import BuildUnionCommunity from "./pages/BuildUnionCommunity";
import BuildUnionMessages from "./pages/BuildUnionMessages";
import BuildUnionForum from "./pages/BuildUnionForum";
import BuildUnionMembers from "./pages/BuildUnionMembers";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ConfirmEmail from "./pages/ConfirmEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DockLogin from "./pages/DockLogin";
import DockRegister from "./pages/DockRegister";
import OrbPage from "./pages/OrbPage";
import ContractView from "./pages/ContractView";
import AdminDashboard from "./pages/AdminDashboard";
import BuildUnionAbout from "./pages/BuildUnionAbout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ProjectProvider>
            <RegionProvider>
              <TooltipProvider>
                <CitationProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<BuildUnion />} />
                      <Route path="/buildunion" element={<BuildUnion />} />
                      <Route path="/dock" element={<Index />} />
                      <Route path="/buildunion/workspace" element={<BuildUnionWorkspace />} />
                      <Route path="/buildunion/workspace/new" element={<BuildUnionNewProject />} />
                      {/* Project details route removed - using Projects2 workflow */}
                      <Route path="/buildunion/facts" element={<BuildUnionProjectFacts />} />
                      <Route path="/buildunion/pricing" element={<BuildUnionPricing />} />
                      <Route path="/buildunion/profile" element={<BuildUnionProfile />} />
                      <Route path="/buildunion/profile/view" element={<BuildUnionProfileView />} />
                      {/* Legacy Quick Mode and Summary routes removed - using Projects2 workflow */}
                      <Route path="/buildunion/community" element={<BuildUnionCommunity />} />
                      <Route path="/buildunion/forum" element={<BuildUnionForum />} />
                      <Route path="/buildunion/members" element={<BuildUnionMembers />} />
                      <Route path="/buildunion/messages" element={<BuildUnionMessages />} />
                      <Route path="/buildunion/login" element={<Login />} />
                      <Route path="/buildunion/register" element={<Register />} />
                      <Route path="/buildunion/confirm-email" element={<ConfirmEmail />} />
                      <Route path="/buildunion/forgot-password" element={<ForgotPassword />} />
                      <Route path="/buildunion/reset-password" element={<ResetPassword />} />
                      <Route path="/dock/login" element={<DockLogin />} />
                      <Route path="/dock/register" element={<DockRegister />} />
                      <Route path="/orb" element={<OrbPage />} />
                      <Route path="/contract/view/:token" element={<ContractView />} />
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/buildunion/about" element={<BuildUnionAbout />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <MobileBottomNav />
                  </BrowserRouter>
                </CitationProvider>
              </TooltipProvider>
            </RegionProvider>
          </ProjectProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
