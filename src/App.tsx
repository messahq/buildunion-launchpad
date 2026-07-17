import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RegionProvider } from "@/hooks/useRegionSettings";
import { UnitProvider } from "@/hooks/useUnitSettings";
import { ThemeProvider } from "@/hooks/useTheme";
import ErrorBoundary from "@/components/ErrorBoundary";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ScrollToTopOnNavigate } from "@/components/ScrollToTopOnNavigate";
import RequireEmailVerification from "@/components/RequireEmailVerification";
import { useEffect } from "react";
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
import ConfirmEmail from "./pages/ConfirmEmail";
import VerifyEmailPending from "./pages/VerifyEmailPending";
import ResetPassword from "./pages/ResetPassword";
import OrbPage from "./pages/OrbPage";
import ContractSignature from "./pages/ContractSignature";
import AdminDashboard from "./pages/AdminDashboard";
import BuildUnionAbout from "./pages/BuildUnionAbout";
import BuildUnionPrivacy from "./pages/BuildUnionPrivacy";
import BuildUnionTerms from "./pages/BuildUnionTerms";
import BuildUnionSecurity from "./pages/BuildUnionSecurity";
import BuildUnionContact from "./pages/BuildUnionContact";
import BuildUnionNewProject from "./pages/BuildUnionNewProject";
import BuildUnionProjectDetails from "./pages/BuildUnionProjectDetails";
import QuickLog from "./pages/QuickLog";
import BuildUnionHelp from "./pages/BuildUnionHelp";
import DemoProject from "./pages/DemoProject";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Syncs landscape orientation state to the <body> data-landscape attribute.
 * This JS-based approach works reliably on Android Chrome where
 * @media (orientation: landscape) can fail due to virtual keyboard / nav bar quirks.
 */
function LandscapeSyncer() {
  useEffect(() => {
    const update = () => {
      const isLandscape = (() => {
        if (typeof screen !== "undefined" && screen.orientation) {
          const t = screen.orientation.type;
          return t === "landscape-primary" || t === "landscape-secondary";
        }
        return window.innerWidth > window.innerHeight;
      })();
      document.body.setAttribute("data-landscape", String(isLandscape));
    };

    update();

    if (typeof screen !== "undefined" && screen.orientation) {
      screen.orientation.addEventListener("change", () => setTimeout(update, 150));
    }
    window.addEventListener("orientationchange", () => setTimeout(update, 150));
    window.addEventListener("resize", update);

    return () => {
      if (typeof screen !== "undefined" && screen.orientation) {
        screen.orientation.removeEventListener("change", update);
      }
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return null;
}

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
                  <LandscapeSyncer />
                  <ScrollToTopOnNavigate />
                  <div className="pb-20 md:pb-0 landscape:pb-0">
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
                      
                      {/* Auth routes — temporarily disabled to prevent accidental sign-ups */}
                      <Route path="/buildunion/login" element={<Navigate to="/" replace />} />
                      <Route path="/buildunion/register" element={<Navigate to="/" replace />} />
                      <Route path="/buildunion/forgot-password" element={<Navigate to="/" replace />} />
                      <Route path="/dock/login" element={<Navigate to="/" replace />} />
                      <Route path="/dock/register" element={<Navigate to="/" replace />} />
                      {/* Kept for existing users mid-flow */}
                      <Route path="/buildunion/confirm-email" element={<ConfirmEmail />} />
                      <Route path="/buildunion/verify-email" element={<VerifyEmailPending />} />
                      <Route path="/buildunion/reset-password" element={<ResetPassword />} />
                      <Route path="/orb" element={<OrbPage />} />
                      {/* Public contract signing page - no auth required */}
                      <Route path="/contract/sign" element={<ContractSignature />} />
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/buildunion/quick-log" element={<RequireEmailVerification><QuickLog /></RequireEmailVerification>} />
                      <Route path="/buildunion/about" element={<BuildUnionAbout />} />
                      <Route path="/buildunion/privacy" element={<BuildUnionPrivacy />} />
                      <Route path="/buildunion/terms" element={<BuildUnionTerms />} />
                      <Route path="/buildunion/security" element={<BuildUnionSecurity />} />
                      <Route path="/buildunion/contact" element={<BuildUnionContact />} />
                      <Route path="/buildunion/help" element={<BuildUnionHelp />} />
                      <Route path="/demo" element={<DemoProject />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
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
