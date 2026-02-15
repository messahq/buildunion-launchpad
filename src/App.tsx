import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RegionProvider } from "@/hooks/useRegionSettings";
import { UnitProvider } from "@/hooks/useUnitSettings";
import { ThemeProvider } from "@/hooks/useTheme";
import ErrorBoundary from "@/components/ErrorBoundary";
import MobileBottomNav from "@/components/MobileBottomNav";
import RequireEmailVerification from "@/components/RequireEmailVerification";
import Index from "./pages/Index";
import BuildUnion from "./pages/BuildUnion";
import BuildUnionWorkspace from "./pages/BuildUnionWorkspace";
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
import VerifyEmailPending from "./pages/VerifyEmailPending";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DockLogin from "./pages/DockLogin";
import DockRegister from "./pages/DockRegister";
import OrbPage from "./pages/OrbPage";
import ContractSignature from "./pages/ContractSignature";
import AdminDashboard from "./pages/AdminDashboard";
import BuildUnionAbout from "./pages/BuildUnionAbout";
import BuildUnionPrivacy from "./pages/BuildUnionPrivacy";
import BuildUnionTerms from "./pages/BuildUnionTerms";
import BuildUnionSecurity from "./pages/BuildUnionSecurity";
import BuildUnionNewProject from "./pages/BuildUnionNewProject";
import BuildUnionProjectDetails from "./pages/BuildUnionProjectDetails";
import QuickLog from "./pages/QuickLog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RegionProvider>
            <UnitProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<BuildUnion />} />
                    <Route path="/buildunion" element={<BuildUnion />} />
                    <Route path="/dock" element={<Index />} />
                    {/* Protected routes - require email verification */}
                    <Route path="/buildunion/workspace" element={<RequireEmailVerification><BuildUnionWorkspace /></RequireEmailVerification>} />
                    <Route path="/buildunion/new-project" element={<RequireEmailVerification><BuildUnionNewProject /></RequireEmailVerification>} />
                    <Route path="/buildunion/project/:projectId" element={<RequireEmailVerification><BuildUnionProjectDetails /></RequireEmailVerification>} />
                    <Route path="/buildunion/profile" element={<RequireEmailVerification><BuildUnionProfile /></RequireEmailVerification>} />
                    <Route path="/buildunion/profile/view" element={<RequireEmailVerification><BuildUnionProfileView /></RequireEmailVerification>} />
                    <Route path="/buildunion/messages" element={<RequireEmailVerification><BuildUnionMessages /></RequireEmailVerification>} />
                    
                    {/* Public/semi-public routes */}
                    <Route path="/buildunion/pricing" element={<BuildUnionPricing />} />
                    <Route path="/buildunion/community" element={<BuildUnionCommunity />} />
                    <Route path="/buildunion/forum" element={<BuildUnionForum />} />
                    <Route path="/buildunion/members" element={<BuildUnionMembers />} />
                    
                    {/* Auth routes */}
                    <Route path="/buildunion/login" element={<Login />} />
                    <Route path="/buildunion/register" element={<Register />} />
                    <Route path="/buildunion/confirm-email" element={<ConfirmEmail />} />
                    <Route path="/buildunion/verify-email" element={<VerifyEmailPending />} />
                    <Route path="/buildunion/forgot-password" element={<ForgotPassword />} />
                    <Route path="/buildunion/reset-password" element={<ResetPassword />} />
                    <Route path="/dock/login" element={<DockLogin />} />
                    <Route path="/dock/register" element={<DockRegister />} />
                    <Route path="/orb" element={<OrbPage />} />
                    {/* Public contract signing page - no auth required */}
                    <Route path="/contract/sign" element={<ContractSignature />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/buildunion/quick-log" element={<RequireEmailVerification><QuickLog /></RequireEmailVerification>} />
                    <Route path="/buildunion/about" element={<BuildUnionAbout />} />
                    <Route path="/buildunion/privacy" element={<BuildUnionPrivacy />} />
                    <Route path="/buildunion/terms" element={<BuildUnionTerms />} />
                    <Route path="/buildunion/security" element={<BuildUnionSecurity />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <MobileBottomNav />
                </BrowserRouter>
              </TooltipProvider>
            </UnitProvider>
          </RegionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
