import HeroSection from "@/components/HeroSection";
import ConstructionDivider from "@/components/ConstructionDivider";
import FeaturesSection from "@/components/FeaturesSection";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import OnboardingTour from "@/components/OnboardingTour";

const BuildUnion = () => {
  return (
    <main className="bg-background">
      <HeroSection />
      <ConstructionDivider />
      <FeaturesSection />
      <PWAInstallPrompt />
      <OnboardingTour />
    </main>
  );
};

export default BuildUnion;
