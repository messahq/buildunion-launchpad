import HeroSection from "@/components/HeroSection";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import OnboardingTour from "@/components/OnboardingTour";

const BuildUnion = () => {
  return (
    <main className="bg-background">
      <HeroSection />
      <PWAInstallPrompt />
      <OnboardingTour />
    </main>
  );
};

export default BuildUnion;
