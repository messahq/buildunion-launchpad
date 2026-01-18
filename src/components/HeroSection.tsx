import { useEffect, useRef } from "react";
import constructionVideo from "@/assets/construction-hero.mp4";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked, that's okay
      });
    }
  }, []);

  return (
    <section className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Video Background */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src={constructionVideo} type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-hero-overlay/60" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pt-0 md:-mt-32">
        <div className="max-w-4xl text-center">
          <h1
            className="font-display text-4xl font-light tracking-tight text-hero-text sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            BuildUnion
          </h1>
          <p
            className="mt-6 font-display text-lg font-semibold leading-relaxed text-hero-text sm:text-xl md:text-2xl animate-fade-in-up opacity-0 max-w-2xl mx-auto"
            style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
          >
            Construction grade project management platform for teams who build the real world
          </p>
          <div
            className="mt-10 animate-fade-in-up opacity-0"
            style={{ animationDelay: "1s", animationFillMode: "forwards" }}
          >
            <Button
              size="lg"
              className="bg-white text-gray-900 hover:bg-white/90 font-semibold text-base px-8 py-6 rounded-md shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              Enter Workspace
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-scroll-hint">
        <ChevronDown className="h-6 w-6 text-hero-text-muted" strokeWidth={1} />
      </div>
    </section>
  );
};

export default HeroSection;
