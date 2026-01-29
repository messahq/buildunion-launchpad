import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import HeroSection from "@/components/HeroSection";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const BuildUnion = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/buildunion/workspace", { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading or nothing while checking auth
  if (loading) {
    return (
      <main className="bg-background min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </main>
    );
  }

  // Only show hero for non-authenticated users
  if (user) {
    return null; // Will redirect
  }

  return (
    <main className="bg-background">
      <HeroSection />
      <PWAInstallPrompt />
    </main>
  );
};

export default BuildUnion;
